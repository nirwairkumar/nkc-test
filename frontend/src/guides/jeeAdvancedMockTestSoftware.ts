/**
 * testoza.com/jee-advanced-mock-test-software — how a coaching institute builds and runs
 * JEE Advanced mocks that behave like the real exam: two papers on one day, one-or-more-
 * correct questions with JEE Advanced's +1-per-option partial marks and −2, numerical
 * answers to two decimal places, List-I/List-II matching and paragraph questions, Paper 1
 * and Paper 2 as one combined sitting with a break, what candidates see, how to read the
 * result, a test-series plan, a checklist for choosing software, mistakes and honest
 * limits. Written for JEE Advanced faculty and institute owners, with TestoZa as the
 * worked example. The JEE Main side lives in jeeMockTestPlatform.ts.
 *
 * Outside facts (sources in `sources`, checked 8 October 2026):
 *   - jeeadv.ac.in: JEE (Advanced) 2026 organised by IIT Roorkee, held on Sunday 17 May
 *     2026; "The examination pattern for JEE (Advanced) 2026 will remain consistent with
 *     that of previous JEE (Advanced) examinations"; computer-based.
 *   - Two compulsory papers of 3 hours each (4 hours for PwD candidates), Physics,
 *     Chemistry and Mathematics in both; ranks from the aggregate of both papers.
 *   - Careers360's breakdown of the 2024 Paper 1, per subject: Section 1, 4 one-correct
 *     questions, +3 / 0 / −1; Section 2, 3 one-or-more-correct, +4 full, +3 / +2 / +1
 *     partial, 0, −2 in all other cases; Section 3, 6 numerical, +4 / 0, no negative;
 *     Section 4, 4 questions at +3 / −1. 60 marks per subject, 180 per paper, 360 total.
 *   - Partial-marks wording (+4 only if all correct options are chosen; +3 if all four are
 *     correct but only three chosen; +2 if three or more correct but only two chosen, both
 *     correct; +1 if two or more correct but only one chosen and correct; 0 if none
 *     chosen; −2 in all other cases): as printed in recent papers and Careers360.
 *   - Numerical answers "correct up to the 2nd decimal place": candidates may truncate or
 *     round (as in jeeMockTestPlatform.ts).
 *
 * TestoZa claims checked against the code on 8 October 2026:
 *   - Partial marks switch (test-builder/QuestionCard.tsx, utils/multiCorrect.ts,
 *     backend services/scoring.py multi_partial_score): per multiple-correct question,
 *     "Proportional" (default; marks × picked ÷ correct) or "JEE Advanced"
 *     (partialMarking: 'per_option', +1 per correct option picked, capped below full
 *     marks); any wrong option → the Wrong mark; full marks only for every correct option.
 *     The server, the exam screen, results, the teacher analysis and the spreadsheet
 *     export all use it. New questions copy the previous question's switch.
 *   - Combined tests (CreateCombinedTestPage.tsx, CombinedIntroPage.tsx,
 *     CombinedBreakScreen.tsx, ResultsPage.tsx CombinedResultsView): pick Paper I and
 *     Paper II, labels, break 0–180 minutes (30 by default), public link; the dashboard's
 *     "Combine two papers" card; candidates sign in to start; the break counts down and
 *     can be skipped ("Skip Break", "Start Paper II Now") or extended ("Add 5 Minutes");
 *     results only after both papers; combined total, percentage, per-paper boxes and
 *     combined correct / wrong / partial / skipped. No combined rank list for faculty:
 *     each paper is its own test in the analysis.
 *   - Passage questions (TestBuilder.tsx handleAddSubQuestion): sub-questions share the
 *     passage and each has its own type, numerical included.
 *   - Everything else (marks per test/section/question, fractions, sections as tabs,
 *     numerical range or exact values on a keypad, the NTA-style exam screen, AI import
 *     with LaTeX and mhchem, Sy Pad, teacher analysis with option breakdown and
 *     discrimination, rank predictor for tests tagged JEE Advanced, plans from ₹49 a week):
 *     as checked for jeeMockTestPlatform.ts, mathTestMaker.ts and
 *     chemistryQuestionPaperMaker.ts.
 *   - NOT in the product: a merged faculty rank list across Paper 1 and Paper 2, an
 *     enforced (unskippable) break, per-section timers, step marking. Don't claim them.
 */
import { JEE_ADVANCED_META } from './meta';
import { EXAM, MARKING_PRESETS, NUMERIC, OPTION_KEYS, OPTION_SPLIT, PAPER, RULE, SESSION } from './jadvData';
import { isNumericalCorrect } from '../utils/numericalAnswer';
import { multiPartialScore } from '../utils/multiCorrect';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const signed = (n: number) => {
    const r = Math.round(n * 100) / 100;
    return r > 0 ? `+${r}` : r < 0 ? `−${-r}` : '0';
};

/* ── Crawler versions of the demos ────────────────────────────────────── */

const caseMarks = (key: string[], picked: string[], mode: 'per_option' | 'proportional') => {
    if (picked.some((p) => !key.includes(p))) return -2;
    if (picked.length === key.length) return 4;
    return multiPartialScore({ partialMarking: mode }, picked.length, key.length, 4);
};

const MARKING_FALLBACK = `
<p>JEE Advanced’s rule for a one-or-more-correct question worth +4 with −2 for a wrong answer:</p>
<div class="ja-table-wrap"><table class="ja-table">
<thead><tr><th scope="col">Marks</th><th scope="col">When</th></tr></thead>
<tbody>
${RULE.map((r) => `<tr><th scope="row">${r.marks}</th><td data-label="When">${r.when}</td></tr>`).join('\n')}
</tbody>
</table></div>
<p>Five cases, marked by TestoZa with each partial-marks setting:</p>
<div class="ja-table-wrap"><table class="ja-table">
<thead><tr><th scope="col">Case</th><th scope="col">Correct options</th><th scope="col">Chosen</th><th scope="col">JEE Advanced setting</th><th scope="col">Proportional setting</th></tr></thead>
<tbody>
${MARKING_PRESETS.map((p) => `<tr><th scope="row">${p.label}</th><td data-label="Correct">${p.key.join(', ')}</td><td data-label="Chosen">${p.picked.join(', ')}</td><td data-label="JEE Advanced">${signed(caseMarks(p.key, p.picked, 'per_option'))}</td><td data-label="Proportional">${signed(caseMarks(p.key, p.picked, 'proportional'))}</td></tr>`).join('\n')}
</tbody>
</table></div>
`;

const PAPERS_FALLBACK = `
<p>A full mock run as one combined test, as a candidate sees it on a phone:</p>
<ol>
<li><strong>Before Paper 1.</strong> “${SESSION.title}”: ${SESSION.paper1.minutes + SESSION.paper2.minutes + SESSION.breakMinutes} minutes in total, ${SESSION.paper1.questions + SESSION.paper2.questions} questions, ${SESSION.paper1.marks + SESSION.paper2.marks} marks. ${SESSION.paper1Label} (${SESSION.paper1.questions} questions, ${SESSION.paper1.minutes} minutes, ${SESSION.paper1.marks} marks), then a ${SESSION.breakMinutes}-minute break, then ${SESSION.paper2Label}. Results are shown only after both papers. The candidate ticks “I understand that results will only be shown after both papers are completed” and presses “Begin — Start ${SESSION.paper1Label}”.</li>
<li><strong>Between the papers.</strong> “${SESSION.paper1Label} Submitted Successfully”, then “Take a Breath.” with the break counting down from ${SESSION.breakMinutes}:00, buttons to add five minutes or skip the break, a rotating tip (“Hydrate! Drink a glass of water.”), and “Start ${SESSION.paper2Label} Now”. Results stay locked until both papers are complete.</li>
<li><strong>After Paper 2.</strong> One combined result: ${SESSION.paper1.score + SESSION.paper2.score} out of ${SESSION.paper1.marks + SESSION.paper2.marks}, each paper’s marks (${SESSION.paper1.score} and ${SESSION.paper2.score} out of 180), and correct, wrong, partly correct and skipped questions counted across both papers.</li>
</ol>
`;

const verdict = (setting: (typeof NUMERIC.presets)[number]['setting'], value: string) => (isNumericalCorrect(setting, value) ? '+4' : '0');

const NUMERIC_FALLBACK = `
<p>${NUMERIC.plain} The value is π/4 = 0.7853…, so 0.78 if a candidate truncates and 0.79 if they round. Six candidates’ answers, marked under four settings (+4 for right, 0 for wrong, as in JEE Advanced’s numerical section):</p>
<div class="ja-table-wrap"><table class="ja-table">
<thead><tr><th scope="col">Answer typed</th>${NUMERIC.presets.map((p) => `<th scope="col">${p.label}</th>`).join('')}</tr></thead>
<tbody>
${NUMERIC.answers.map((a) => `<tr><th scope="row">${a.value} (${a.name})</th>${NUMERIC.presets.map((p) => `<td data-label="${p.label}">${verdict(p.setting, a.value)}</td>`).join('')}</tr>`).join('\n')}
</tbody>
</table></div>
<p>“Exact: 0.79” fails the candidate who truncated, which the paper allows. “Range 0.75 to 0.80” gives full marks to 0.77 and 0.8, which are wrong. The range 0.78 to 0.79 is the fair one.</p>
`;

const examAnswer = (q: (typeof EXAM)[number]) => `${q.section}, +${q.marks}${q.negative ? ` / −${q.negative}` : ', no negative'}`;

const EXAM_FALLBACK = `
<p>A six-question paper in the style of a JEE Advanced Paper 1, on TestoZa’s exam screen at a phone’s real size (${PAPER.title}). Answer, tick as many options as you’re sure of in the one-or-more-correct questions, type the numerical answers on the keypad, then check your marks.</p>
<ol>
${EXAM.map((q) => `<li>${q.plain}${q.optionsPlain ? ' ' + OPTION_KEYS.map((k) => `(${k}) ${q.optionsPlain?.[k]}`).join(' ') : ''} [${examAnswer(q)}. Answer: ${q.answerPlain}.]</li>`).join('\n')}
</ol>
`;

const OPTIONS_FALLBACK = `
<p>${OPTION_SPLIT.plain} How a batch of ${OPTION_SPLIT.students} answered (made-up numbers), and what each choice tells the faculty:</p>
<ul>
${OPTION_SPLIT.options.map((o) => `<li><strong>(${o.key}) ${o.plain}: ${o.count} candidates.</strong> ${o.means}${o.reteach ? ` ${o.reteach}` : ''}</li>`).join('\n')}
</ul>
`;

/* ── The guide ─────────────────────────────────────────────────────────── */

export const JEE_ADVANCED_MOCK_TEST_SOFTWARE: Guide = {
    meta: JEE_ADVANCED_META,
    body: {
        intro: [
            html(`
<p>Most “JEE mock tests” are JEE Main mocks with harder questions. That isn’t a JEE Advanced mock. The real exam is two compulsory three-hour papers on the same day, and it marks differently from almost every other test a student has taken: a one-or-more-correct question gives one mark for each correct option chosen, full marks only for all of them, and −2 for a single wrong tick. Numerical answers go in to two decimal places. One section asks candidates to match List-I with List-II. A mock that gets any of this wrong trains the wrong instincts, and in an exam where a few marks move a rank by hundreds, instincts are most of what a mock is for.</p>
<p>This guide is about running JEE Advanced mocks that behave like the real thing. It covers what a mock has to copy from the paper, the partial-marking rule (with a calculator you can try), how to build each kind of question, how to run Paper 1 and Paper 2 as one sitting with a break, what candidates see on their screen, and how to read the result so the next fortnight of teaching changes. Every demo on this page works: tick options and watch the marks, take the break between papers, sit a short paper.</p>
<p>It is written for JEE Advanced faculty and the people who run coaching institutes, from a two-teacher centre with one Advanced batch to a chain with a test series across cities. We use TestoZa as the worked example, and we say plainly where it falls short.</p>
`),
        ],
        answer:
            'Good JEE Advanced mock test software runs Paper 1 and Paper 2 as one sitting with a break, marks one-or-more-correct questions exactly as JEE Advanced does (+1 for each correct option, full marks only for all of them, −2 for any wrong option), accepts numerical answers to two decimal places, handles List-I/List-II matching and paragraph questions, and adds both papers into one score out of 360. In TestoZa you build each paper as a test with Physics, Chemistry and Mathematics sections, switch multiple-correct questions to “JEE Advanced” partial marks, and combine the two papers with a break; candidates take it on a phone or a laptop.',
        sections: [
            {
                id: 'what-to-copy',
                title: 'What a JEE Advanced mock has to copy from the real paper',
                tocLabel: 'What to copy',
                kicker: 'The exam',
                blocks: [
                    html(`
<p>JEE Advanced is set by one of the IITs each year, in rotation. The 2026 exam was organised by IIT Roorkee and held on Sunday 17 May 2026, as a computer-based test. Every candidate sits two papers, Paper 1 and Paper 2, of three hours each, on the same day, with Physics, Chemistry and Mathematics in both. Both are compulsory, and ranks come from the total of the two.</p>
<p>What the IITs don’t publish in advance is the exact paper. The official site for 2026 said only that the pattern “will remain consistent with that of previous JEE (Advanced) examinations”. The number of questions, the sections and the marks for each section are announced in the instructions on the day, and they have changed from year to year. As one example, here is the 2024 Paper 1, for each subject, as Careers360 breaks it down:</p>
<div class="ja-table-wrap"><table class="ja-table">
<thead><tr><th scope="col">Section</th><th scope="col">Question type</th><th scope="col">Questions</th><th scope="col">Marking</th></tr></thead>
<tbody>
<tr><th scope="row">Section 1</th><td data-label="Type">One correct option out of four</td><td data-label="Questions">4</td><td data-label="Marking">+3 right, 0 unanswered, −1 wrong</td></tr>
<tr><th scope="row">Section 2</th><td data-label="Type">One or more correct options</td><td data-label="Questions">3</td><td data-label="Marking">+4 for all correct options, +3 / +2 / +1 partial, 0 unanswered, −2 otherwise</td></tr>
<tr><th scope="row">Section 3</th><td data-label="Type">Numerical answer</td><td data-label="Questions">6</td><td data-label="Marking">+4 right, 0 otherwise: no negative marks</td></tr>
<tr><th scope="row">Section 4</th><td data-label="Type">One correct option (matching lists in recent papers)</td><td data-label="Questions">4</td><td data-label="Marking">+3 right, 0 unanswered, −1 wrong</td></tr>
</tbody>
</table></div>
<p>That is 17 questions and 60 marks per subject, 180 marks per paper and 360 for the day. Paper 2 follows the same idea with its own mix; recent Paper 2s have included paragraph-based questions, where two questions share one passage. So the first rule for anyone building mocks: <strong>don’t hard-code one year’s pattern.</strong> Your software has to let you set the sections, question types and marks per section yourself, and change them when the next paper surprises everybody.</p>
<p>It also helps to be clear about how JEE Advanced differs from JEE Main, because many institutes run both from the same tool:</p>
<div class="ja-table-wrap"><table class="ja-table">
<thead><tr><th scope="col"></th><th scope="col">JEE Main</th><th scope="col">JEE Advanced</th></tr></thead>
<tbody>
<tr><th scope="row">Papers on the day</th><td data-label="JEE Main">One paper, 3 hours</td><td data-label="JEE Advanced">Two papers, 3 hours each</td></tr>
<tr><th scope="row">Question types</th><td data-label="JEE Main">One correct option, and numerical answers</td><td data-label="JEE Advanced">One correct, one or more correct, numerical (often to two decimals), matching lists, paragraphs</td></tr>
<tr><th scope="row">Marking</th><td data-label="JEE Main">+4 / −1, the same for almost every question</td><td data-label="JEE Advanced">Different in every section: +3 / −1, +4 with partial marks and −2, +4 with no negative</td></tr>
<tr><th scope="row">Pattern known in advance</th><td data-label="JEE Main">Yes, in the information bulletin</td><td data-label="JEE Advanced">Only roughly; the paper’s instructions give it on the day</td></tr>
<tr><th scope="row">What a mock mostly trains</th><td data-label="JEE Main">Speed and accuracy</td><td data-label="JEE Advanced">Judgement: when to stop ticking, when to skip, how to split three hours across sections that mark differently</td></tr>
</tbody>
</table></div>
<p>For JEE Main mocks, our <a href="/jee-mock-test-platform">JEE mock test platform guide</a> covers the single-paper, +4/−1 side, including how faculty type integrals and chemical equations without learning LaTeX. This guide sticks to what is different about Advanced.</p>
`),
                ],
            },
            {
                id: 'partial-marking',
                title: 'JEE Advanced partial marking, exactly as the paper does it',
                tocLabel: 'Partial marking',
                kicker: 'Marking',
                blocks: [
                    html(`
<p>The one-or-more-correct section is where JEE Advanced is most unlike anything else, and where a mock most often gets it wrong. Recent papers print the rule like this, for a question worth 4 marks:</p>
<ul class="ja-checks">
<li><strong>+4</strong> only if all the correct options are chosen, and nothing else.</li>
<li><strong>+3</strong> if all four options are correct but only three are chosen.</li>
<li><strong>+2</strong> if three or more options are correct but only two are chosen, both of them correct.</li>
<li><strong>+1</strong> if two or more options are correct but only one is chosen, and it is correct.</li>
<li><strong>0</strong> if no option is chosen.</li>
<li><strong>−2</strong> in every other case, which in practice means: any wrong option chosen.</li>
</ul>
<p>Read it as two simple rules. Every correct option you are sure of is worth one mark on its own. Every option you are not sure of is a bet that risks the whole question at −2. That asymmetry is the whole skill: a candidate who ticks two certain options and stops scores +2, and a candidate who adds a hopeful third that turns out wrong scores −2. Four marks of difference, on one question, from one tick.</p>
<p>That is why the marking in a mock has to be exact. Plenty of test software gives multiple-correct questions all or nothing, which teaches students never to stop short. Others give proportional credit (two of three correct options = two-thirds of the marks), which over-rewards stopping short when there are two or three correct options. Both train the wrong habit. Try the cases below; the builder card on the left has the switch that decides how TestoZa marks a question.</p>
`),
                    { type: 'widget', widget: 'jadv-marking', fallbackHtml: MARKING_FALLBACK },
                    html(`
<p>In TestoZa every multiple-correct question has a <strong>Partial marks</strong> switch under its options:</p>
<ul>
<li><strong>JEE Advanced</strong>: +1 for each correct option chosen, full marks only when every correct option is chosen, and the question’s Wrong mark (−2) for any wrong option. This is the rule above, line for line. Use it for every one-or-more-correct question in an Advanced mock.</li>
<li><strong>Proportional</strong> (the default): the question’s marks multiplied by the share of correct options chosen. Two of three correct options on a 4-mark question gives 2.67. Useful for school tests and for exams that mark this way; not for JEE Advanced.</li>
</ul>
<p>The two settings agree whenever all four options are correct, whenever a candidate picks every correct option, and whenever a candidate picks a wrong one. They differ only when two or three options are correct and a candidate stops short, which is exactly the situation the real exam is testing. The switch is per question, and each new question you add copies the previous question’s setting, so in practice you set it once per section. The same rule is used everywhere a score appears: on our server when the paper is submitted, on the candidate’s result, in the faculty analysis and in the downloaded spreadsheet.</p>
`),
                ],
            },
            {
                id: 'build',
                title: 'Building a JEE Advanced paper, section by section',
                tocLabel: 'Building the paper',
                kicker: 'Building',
                blocks: [
                    html(`
<p>A JEE Advanced paper is a normal test with a few deliberate settings. Here is the order that saves the most time, for Paper 1; Paper 2 is the same with its own sections.</p>
<ol class="ja-steps">
<li><strong>Get the questions in.</strong> If the questions exist as a PDF (your own DPPs, last year’s mock, a reference sheet), <a href="/generate-with-ai">upload it</a> and choose Extract: AI types every question with its integrals, matrices and chemical equations in LaTeX and mhchem, crops diagrams, and brings sections back as sections. For new questions, the builder and its Sy Pad keyboard let faculty type maths and chemistry without knowing LaTeX.</li>
<li><strong>Make one section per subject.</strong> Physics, Chemistry and Mathematics as sections give candidates subject tabs on the exam screen, the way the real interface groups questions, and split the results by subject.</li>
<li><strong>Order each subject the way the paper does.</strong> One-correct questions first, then one-or-more-correct, then numerical, then matching (or paragraphs in Paper 2), so section numbers in your instructions match what candidates see.</li>
<li><strong>Set marks per question type.</strong> Marks in TestoZa can be set for the whole test, a section or a single question, and the most specific wins. Put the most common marking on the test (say +3 / −1), then override the question types that differ: +4 / −2 on one-or-more-correct, +4 / 0 on numerical.</li>
<li><strong>Switch multiple-correct questions to JEE Advanced partial marks.</strong> Set it on the first one in each subject and the questions you add after it copy it; for imported questions, tap it on each (there are usually three per subject).</li>
<li><strong>Set numerical answers as ranges.</strong> For a two-decimal answer, accept the range from the truncated to the rounded value (0.78 to 0.79 for 0.785…). For an integer answer, use Exact value(s). The next section shows why.</li>
<li><strong>Write the instructions.</strong> Put the section-by-section marking in the test description, exactly as the paper would: candidates should never have to guess what a wrong tick costs.</li>
<li><strong>Sit it yourself, on a phone and on a laptop.</strong> Ten minutes as a candidate catches a missing answer key, a matching table that is too wide, and the one question still on proportional marks.</li>
</ol>
<p>Here is how each JEE Advanced question type maps onto TestoZa:</p>
<div class="ja-table-wrap"><table class="ja-table">
<thead><tr><th scope="col">In the paper</th><th scope="col">Question type in TestoZa</th><th scope="col">Settings</th></tr></thead>
<tbody>
<tr><th scope="row">One correct option</th><td data-label="Type">Single correct</td><td data-label="Settings">+3 / −1 (or whatever the year uses)</td></tr>
<tr><th scope="row">One or more correct options</th><td data-label="Type">Multiple correct</td><td data-label="Settings">+4 / −2, Partial marks: JEE Advanced</td></tr>
<tr><th scope="row">Numerical value to two decimals</th><td data-label="Type">Numerical answer, a range</td><td data-label="Settings">+4 / 0; truncated to rounded value</td></tr>
<tr><th scope="row">Non-negative integer</th><td data-label="Type">Numerical answer, exact value(s)</td><td data-label="Settings">+4 / 0</td></tr>
<tr><th scope="row">Matching List-I with List-II</th><td data-label="Type">Single correct, lists in a table in the question</td><td data-label="Settings">+3 / −1; the four codings as options</td></tr>
<tr><th scope="row">Paragraph with two questions</th><td data-label="Type">Passage, with a sub-question for each</td><td data-label="Settings">Each sub-question has its own type and marks</td></tr>
</tbody>
</table></div>
<p>None of this needs a separate “JEE Advanced mode”. That is deliberate: the year the IITs add a new section or change its marks, you change a setting rather than wait for a software update.</p>
`),
                ],
            },
            {
                id: 'numerical',
                title: 'Numerical answers to two decimal places, marked fairly',
                tocLabel: 'Numerical answers',
                kicker: 'Numerical answers',
                blocks: [
                    html(`
<p>JEE Advanced numerical questions often ask for the answer “correct up to the 2nd decimal place”, and candidates may truncate or round. If the true value is 0.785…, both 0.78 and 0.79 are right, and a careful candidate who types 0.785 has not done anything wrong either. A mock that rejects a correct answer costs a candidate four marks for nothing, and teaches them to distrust their own working.</p>
<p>TestoZa takes a numerical answer in one of two ways: <strong>a range</strong> (lowest and highest correct, everything between is right) or <strong>exact values</strong> (a list, any of which is right). Answers are compared as numbers, so 0.8 and 0.80 are the same. Try four settings on six candidates’ answers to one question:</p>
`),
                    { type: 'widget', widget: 'jadv-numerical', fallbackHtml: NUMERIC_FALLBACK },
                    html(`
<p>The rule that works for every two-decimal answer: <strong>set the range from the truncated value to the rounded value</strong>, here 0.78 to 0.79. If the official answer key of a past paper gives a range, copy it exactly; the IITs often publish one. For a non-negative integer answer (the number of unpaired electrons, the number of real roots), use exact values with the one integer. And when you write your own numerical questions, check the answer doesn’t sit on a rounding knife-edge such as 2.345, unless that is the point of the question.</p>
<p>Candidates type numerical answers on an on-screen keypad, as in a computer-based exam, so a phone’s own keyboard never covers the question. The keypad accepts digits, one decimal point and a minus sign.</p>
`),
                ],
            },
            {
                id: 'matching-paragraphs',
                title: 'Matching lists and paragraph questions',
                tocLabel: 'Matching and paragraphs',
                kicker: 'Question types',
                blocks: [
                    html(`
<p><strong>Matching (List-I and List-II).</strong> In recent papers a matching question gives four entries in List-I (P, Q, R, S), five in List-II (1 to 5), and four options, each a complete coding such as P → 2, Q → 1, R → 3, S → 4. Only one coding is right, so it is a single-correct question with the two lists in the question. Put them in a table: the Sy Pad’s Tables tab has a Match List layout, and the AI import turns printed lists into tables when it reads a paper. Keep each entry short, because on a phone the table is the widest thing on the screen; the exam screen lets it scroll sideways inside the question rather than squeezing it.</p>
<p>The options are where a matching question is won or lost. A good set of codings has three wrong options that each come from one specific, common mistake (P → 1 for a candidate who uses sin x/x instead of sin 3x/x; R and S swapped for one who mixes up a derivative and a combination), so that the faculty analysis later tells you which mistake your batch made. A set of random codings tells you nothing.</p>
<p><strong>Paragraph questions.</strong> A paragraph is one passage followed by two questions that depend on it. In TestoZa it is a Passage question with a sub-question for each part, and each sub-question has its own type and marks, so “one correct option” and “numerical answer” can share one passage. Candidates see the passage above each sub-question, so they never have to scroll back to find the data.</p>
<p>Both appear in the short paper further down: Question 6 is a matching question with the lists drawn as a table.</p>
`),
                ],
            },
            {
                id: 'two-papers',
                title: 'Paper 1 and Paper 2 as one sitting, with a break',
                tocLabel: 'Two papers, one sitting',
                kicker: 'The day',
                blocks: [
                    html(`
<p>The second thing a JEE Advanced mock has to copy is the day itself. Sitting a three-hour paper is one skill; sitting a second one after a break, with Paper 1 still on your mind, is another. Candidates who have only ever done one paper at a time discover on exam day how much their accuracy drops in the second half of Paper 2. A full mock should make them discover it in February.</p>
<p>In TestoZa you build Paper 1 and Paper 2 as two tests, then join them as a <strong>combined test</strong>: choose “Combine two papers” on the dashboard, pick the two papers, name them (Paper 1 and Paper 2, or Paper I and Paper II), and set the break. The break can be anything from 0 to 180 minutes; it is 30 unless you change it. Candidates get one link, sign in, and see the whole day before they start. Here are the three screens they move through:</p>
`),
                    { type: 'widget', widget: 'jadv-papers', fallbackHtml: PAPERS_FALLBACK },
                    html(`
<p>Three things are worth knowing before you run one:</p>
<ul>
<li><strong>The score stays hidden until both papers are done.</strong> Candidates don’t see Paper 1’s result during the break, which is how the real day works and stops a bad Paper 1 from wrecking Paper 2.</li>
<li><strong>The break is the candidate’s.</strong> The countdown runs, but a candidate can skip it or add five minutes at a time. If you want everyone to start Paper 2 together, run the papers at fixed times in a hall and tell candidates when to press Start.</li>
<li><strong>Choose the break length on purpose.</strong> On the real day the papers are a morning and an afternoon session. A 30-minute break is right for a mock squeezed into a Sunday; a longer one, closer to the real gap, is better for the final full mocks in April and May.</li>
</ul>
<p>The combined result adds both papers into one total out of 360 and shows each paper’s marks beside it, along with correct, partly correct, wrong and skipped questions across both. Each paper is still its own test underneath, so it has its own detailed result for the candidate and its own analysis for the faculty.</p>
`),
                ],
            },
            {
                id: 'candidate-view',
                title: 'What candidates see during the paper',
                tocLabel: 'On the candidate’s screen',
                kicker: 'The exam screen',
                blocks: [
                    html(`
<p>JEE Advanced is computer-based, so the mock should feel like the same kind of screen: a question at a time, a palette of question numbers, Save &amp; Next, a flag for review, a timer and a Submit button. TestoZa’s exam screen follows the NTA-style layout Indian candidates already know from JEE Main, on a laptop in a lab or on a phone at home. Three details matter for Advanced:</p>
<ul>
<li><strong>Every question shows what it is worth.</strong> A chip beside the question number says “+4 | −2” or “+3 | −1”, so a candidate always knows the cost of a guess on the question in front of them.</li>
<li><strong>Multiple-correct options look different.</strong> Their keys are square and show a tick when chosen, and any number can be chosen, while one-correct options are round and choosing one replaces the last. Candidates learn at a glance which kind of question they are on.</li>
<li><strong>Maths is sharp at any size.</strong> Integrals, matrices and chemical equations are drawn as text, so they stay sharp when a candidate makes the text bigger with the faint − and + at the top right of the question.</li>
</ul>
<p>Try it on a six-question paper written for this page: one question from each kind of section, marked the way TestoZa marks a real paper.</p>
`),
                    { type: 'widget', widget: 'jadv-exam', fallbackHtml: EXAM_FALLBACK },
                    html(`
<p>If you run mocks in a centre, the same paper can be given at a fixed time with a join code, and exam rules such as full screen and tab-switch warnings are available on the paid plans; see our guides to <a href="/how-to-conduct-online-exam">conducting an online exam</a> and <a href="/prevent-cheating-in-online-exams">preventing cheating in online exams</a>.</p>
`),
                ],
            },
            {
                id: 'after-the-mock',
                title: 'After the mock: reading what the result says',
                tocLabel: 'Reading the result',
                kicker: 'After the mock',
                blocks: [
                    html(`
<p>A JEE Advanced score on its own says very little. Two candidates on 150 out of 360 can need opposite advice: one is losing 30 marks to −2s in the one-or-more-correct sections, the other is leaving 40 marks of easy numericals unattempted. The point of the mock is to tell them apart.</p>
<p>Candidates get their result as soon as they submit (for a combined test, after Paper 2): every question marked right, partly right, wrong or skipped, the marks it earned, and the time spent on it. For tests tagged JEE Advanced they can also ask for a rough rank estimate, which is a direction, not a prediction. Faculty get the batch view: a rank list, and for every question the share of candidates who chose each option, the accuracy, the average time and a <em>discrimination index</em>, which says whether candidates who did well overall got this question right more often than those who didn’t. As a rule of thumb, 0.3 and above means the question separates strong and weak candidates well; near zero, it doesn’t; and a negative value usually means the question or its key is wrong.</p>
<p>The option breakdown is the most useful screen in the product for a JEE faculty member. Tap the options below: one Physics question from the paper above, for a made-up batch of 60.</p>
`),
                    { type: 'widget', widget: 'jadv-options', fallbackHtml: OPTIONS_FALLBACK },
                    html(`
<p>For JEE Advanced in particular, read four things after every mock:</p>
<ul class="ja-checks">
<li><strong>Marks lost to −2s.</strong> Count wrong answers in the one-or-more-correct sections. A candidate losing more than a few marks there needs a rule, not more physics: tick only what you would bet on.</li>
<li><strong>Partly correct answers.</strong> Many “partial” results with no wrong ones is a candidate playing it safe, which is usually right. Almost none, with many −2s, is a candidate who never stops ticking.</li>
<li><strong>Numerical attempts.</strong> Where numericals carry no negative mark, as in most recent papers, an unattempted one is four marks thrown away if the candidate had any working at all.</li>
<li><strong>Paper 2 against Paper 1.</strong> A candidate who drops sharply in Paper 2 has a stamina problem, and the fix is more full two-paper mocks, not more chapters.</li>
</ul>
<p>The rank list, the full per-question analysis and the exam rules are part of the paid plans, which start at ₹49 a week; making and sharing tests is free.</p>
`),
                ],
            },
            {
                id: 'test-series',
                title: 'Planning a JEE Advanced test series for a batch',
                tocLabel: 'A test series plan',
                kicker: 'For institutes',
                blocks: [
                    html(`
<p>A test series is a teaching plan, not a pile of papers. The shape most institutes settle on moves from chapter tests to part tests to full two-paper mocks, and gets closer to the real day as it goes:</p>
<div class="ja-table-wrap"><table class="ja-table">
<thead><tr><th scope="col">Phase</th><th scope="col">What to run</th><th scope="col">How often</th><th scope="col">What it trains</th></tr></thead>
<tbody>
<tr><th scope="row">While the syllabus is being taught</th><td data-label="What to run">Chapter tests with all four Advanced question types, one paper of 60 to 90 minutes</td><td data-label="How often">Weekly</td><td data-label="What it trains">The question types and the marking, chapter by chapter</td></tr>
<tr><th scope="row">After each third of the syllabus</th><td data-label="What to run">Part tests: one full-length paper on the chapters so far</td><td data-label="How often">Every two to three weeks</td><td data-label="What it trains">Three hours of concentration; choosing which questions to leave</td></tr>
<tr><th scope="row">After the syllabus is done</th><td data-label="What to run">Full mocks: Paper 1 and Paper 2 as a combined test</td><td data-label="How often">Weekly, then twice a week in the last month</td><td data-label="What it trains">The whole day, including the second paper</td></tr>
<tr><th scope="row">Last two weeks</th><td data-label="What to run">Two or three full mocks at the real timings, then past papers</td><td data-label="How often">As the calendar allows</td><td data-label="What it trains">Calm, and a routine for the day</td></tr>
</tbody>
</table></div>
<p>Two habits make a test series work. First, <strong>a discussion after every full mock</strong>, built from the option breakdown, not from the solutions alone: twenty minutes on the three questions most of the batch got wrong the same way is worth more than two hours on all 102. Second, <strong>keep a mistake log per candidate</strong>: −2s, skipped numericals, Paper 2 drop. The scores go up when the log gets shorter.</p>
<p>Write your own questions where you can. Past JEE Advanced papers are the best practice material there is, but strong candidates have often seen them, and a mock made only of past questions measures memory as much as problem-solving. A good full mock mixes new questions in the past papers’ style with a few past questions you want the batch to know cold.</p>
`),
                ],
            },
            {
                id: 'checklist',
                title: 'A checklist for choosing JEE Advanced mock test software',
                tocLabel: 'Choosing software',
                kicker: 'Choosing',
                blocks: [
                    html(`
<p>Whatever you use, test it against the real paper before you sell a test series on it. Ten questions to ask, with how TestoZa answers each:</p>
<div class="ja-table-wrap"><table class="ja-table">
<thead><tr><th scope="col">Ask</th><th scope="col">Why it matters</th><th scope="col">TestoZa</th></tr></thead>
<tbody>
<tr><th scope="row">Does it give +1 per correct option on one-or-more-correct questions, with −2 for any wrong option?</th><td data-label="Why">All-or-nothing or proportional marking trains the wrong ticking habit</td><td data-label="TestoZa">Yes: Partial marks set to JEE Advanced</td></tr>
<tr><th scope="row">Can every section have its own marks and negative marks?</th><td data-label="Why">Advanced uses three or four marking schemes in one paper</td><td data-label="TestoZa">Yes: per test, section or question</td></tr>
<tr><th scope="row">Can a numerical answer be a range?</th><td data-label="Why">Two-decimal answers can be truncated or rounded</td><td data-label="TestoZa">Yes, or a list of exact values</td></tr>
<tr><th scope="row">Can it run Paper 1 and Paper 2 as one sitting?</th><td data-label="Why">The second paper is half the exam</td><td data-label="TestoZa">Yes: a combined test with a break and one total</td></tr>
<tr><th scope="row">Can faculty type maths and chemistry without LaTeX?</th><td data-label="Why">Otherwise papers stay in PDFs</td><td data-label="TestoZa">Yes: AI import from a PDF or photo, and the Sy Pad keyboard</td></tr>
<tr><th scope="row">Does the exam screen look like a computer-based test?</th><td data-label="Why">The interface shouldn’t be new on exam day</td><td data-label="TestoZa">Yes: an NTA-style screen with a palette, flags and a keypad</td></tr>
<tr><th scope="row">Does it work on a phone?</th><td data-label="Why">Many candidates practise at home on one</td><td data-label="TestoZa">Yes, and on laptops and lab computers</td></tr>
<tr><th scope="row">Does the faculty analysis show which wrong option was chosen?</th><td data-label="Why">That is what tells you what to reteach</td><td data-label="TestoZa">Yes, with accuracy, time and discrimination</td></tr>
<tr><th scope="row">Is the score calculated on the server?</th><td data-label="Why">A score sent by the browser can be edited</td><td data-label="TestoZa">Yes, from the saved answers</td></tr>
<tr><th scope="row">Can you change the pattern yourself next year?</th><td data-label="Why">The IITs change it without notice</td><td data-label="TestoZa">Yes: it is settings, not a fixed template</td></tr>
</tbody>
</table></div>
`),
                ],
            },
            {
                id: 'mistakes',
                title: 'Ten mistakes that make a JEE Advanced mock misleading',
                tocLabel: 'Ten mistakes',
                kicker: 'Mistakes',
                blocks: [
                    html(`
<ol class="ja-steps">
<li><strong>A JEE Main paper with harder questions.</strong> Without one-or-more-correct, matching and two-decimal numericals, it isn’t an Advanced mock, whatever the difficulty.</li>
<li><strong>All-or-nothing marking on multiple-correct questions.</strong> It teaches candidates that stopping short is worthless, which is the opposite of the real paper.</li>
<li><strong>Proportional partial marks.</strong> Closer, but two of three correct options becomes 2.67 instead of 2, and candidates learn the wrong value of a cautious answer.</li>
<li><strong>The same negative mark everywhere.</strong> −1 on a one-or-more-correct question makes reckless ticking cheap; −1 on a numerical punishes an attempt that recent papers usually haven’t.</li>
<li><strong>Numerical answers set to one exact value.</strong> A candidate who truncated correctly loses four marks.</li>
<li><strong>Matching options that are random codings.</strong> Three wrong codings should each come from a real mistake, or the analysis has nothing to say.</li>
<li><strong>Only ever one paper at a time.</strong> The Paper 2 drop never shows up until the real day.</li>
<li><strong>No marking scheme in the instructions.</strong> Candidates guessing what a wrong tick costs are practising guessing.</li>
<li><strong>Past papers only.</strong> Your strongest candidates remember the answers; the mock measures memory.</li>
<li><strong>No discussion afterwards.</strong> A score without a conversation about the option breakdown changes nothing in the next mock.</li>
</ol>
`),
                ],
            },
            {
                id: 'limits',
                title: 'Where TestoZa falls short for JEE Advanced (for now)',
                tocLabel: 'Honest limits',
                kicker: 'Honest limits',
                blocks: [
                    html(`
<ul class="ja-limits">
<li><strong>No merged rank list across both papers for faculty.</strong> Candidates see one combined total, but in the faculty analysis Paper 1 and Paper 2 are separate tests, each with its own rank list. For a combined batch ranking, download both papers’ results and add them.</li>
<li><strong>The break isn’t enforced.</strong> Candidates can skip it or extend it. For a strict, everyone-together mock, run it in a hall at fixed times.</li>
<li><strong>Partial marks are set per question.</strong> New questions copy the previous question’s setting, but imported questions start on Proportional; switch them before the paper goes live.</li>
<li><strong>No per-section timers.</strong> JEE Advanced doesn’t have them either (candidates move freely within a paper), so this matters only if you want drills that lock a section.</li>
<li><strong>AI needs a human check.</strong> Clean print reads very well; a faint photocopy less so, and a lost minus sign or a misread subscript changes a JEE question completely. Read every imported paper once.</li>
<li><strong>No step marking.</strong> Everything is marked automatically, so subjective answers and derivations stay on paper.</li>
</ul>
`),
                ],
            },
        ],
        faqs: [
            {
                q: 'What is JEE Advanced mock test software?',
                a: 'Software that lets an institute or teacher build and run mocks that behave like the real JEE Advanced: two papers on one day, one-or-more-correct questions with +1 per correct option and −2 for a wrong one, numerical answers to two decimal places, matching lists and paragraph questions, and one combined score out of 360. TestoZa does all of these in any browser.',
            },
            {
                q: 'Does TestoZa give JEE Advanced partial marks exactly?',
                a: 'Yes. Set a multiple-correct question’s Partial marks to “JEE Advanced”: a candidate gets +1 for each correct option chosen, the full +4 only for all of them, and the question’s negative mark (−2) for any wrong option. The default, Proportional, gives marks × options chosen ÷ correct options instead.',
            },
            {
                q: 'Can I run Paper 1 and Paper 2 together with a break?',
                a: 'Yes. Build each paper as a test, then choose “Combine two papers” on the dashboard, pick both papers and set a break of 0 to 180 minutes. Candidates get one link, take Paper 1, have the break and then take Paper 2. Results are shown only after both papers, as one total.',
            },
            {
                q: 'How do I set a numerical answer to two decimal places?',
                a: 'Use “A range of values” from the truncated value to the rounded value. For an answer of 0.785…, set 0.78 to 0.79, so both truncated and rounded answers (and 0.785 itself) are marked correct. Use exact values for integer answers.',
            },
            {
                q: 'How do I make a List-I / List-II matching question?',
                a: 'As a single-correct question. Put List-I and List-II in a table in the question (the Sy Pad’s Tables tab has a Match List layout, and the AI import turns printed lists into tables), and make the four options the four codings, such as P → 2, Q → 1, R → 3, S → 4.',
            },
            {
                q: 'Can each section have different marks and negative marks?',
                a: 'Yes. Marks can be set for the whole test, a section or a single question, and the most specific one wins. A typical Advanced paper uses +3/−1 for one-correct questions, +4/−2 for one-or-more-correct and +4 with no negative mark for numericals, but follow the latest paper.',
            },
            {
                q: 'Can I import my existing JEE Advanced papers?',
                a: 'Yes. Upload a PDF or photos and choose Extract: TestoZa’s AI types each question with its maths and chemistry in LaTeX and mhchem, crops diagrams, and keeps sections. Check the paper once afterwards, and set the multiple-correct questions to JEE Advanced partial marks.',
            },
            {
                q: 'Can students take the mock on a phone?',
                a: 'Yes. The same NTA-style exam screen runs on phones, laptops and lab computers. Numerical answers are typed on an on-screen keypad, and maths stays sharp when the text is made bigger.',
            },
            {
                q: 'Do candidates get a rank?',
                a: 'Faculty get a rank list for each paper on the paid plans. Candidates see their own marks straight away (for a combined test, after Paper 2), and for tests tagged JEE Advanced they can ask for a rough rank estimate, which is a direction rather than a prediction.',
            },
            {
                q: 'Is there negative marking for numerical questions in JEE Advanced?',
                a: 'Usually not. In the 2024 Paper 1, for example, numerical answers scored +4 if right and 0 otherwise, but the marking is stated in each paper’s instructions on the day and has varied between papers and years. Set the numerical questions in your mock to whatever the latest paper used; in TestoZa that is one number per question or section.',
            },
            {
                q: 'Is TestoZa free for JEE Advanced mocks?',
                a: 'Making tests, combining two papers and sharing them is free. Paid plans, from ₹49 a week, add the full faculty analysis and rank lists, exam-security rules, institute branding and more result submissions.',
            },
            {
                q: 'How is this different from a JEE Main mock?',
                a: 'JEE Main is one paper with mostly +4/−1 marking. JEE Advanced is two papers with different marking in every section, partial marks on one-or-more-correct questions, matching lists and paragraph questions. Our JEE mock test platform guide covers the JEE Main side.',
            },
        ],
        closingTitle: 'Run one full JEE Advanced mock this month',
        closing: [
            html(`
<p>Don’t start by rebuilding your whole test series. Take the next full mock you were going to print, put Paper 1 and Paper 2 online with the marking set exactly as above, combine them with a break, and run it for one batch. Then spend twenty minutes with the option breakdown before the discussion class. One mock will tell you more about your batch than this guide can.</p>
<div class="ja-paths">
<a class="ja-path" href="/generate-with-ai" data-icon="doc"><span class="ja-path-who">Have the paper as a PDF?</span><span class="ja-path-what">Upload it and let AI type it</span></a>
<a class="ja-path" href="/create-test" data-icon="pencil"><span class="ja-path-who">Writing new questions?</span><span class="ja-path-what">Open the builder and the Sy Pad</span></a>
<a class="ja-path" href="/create-combined-test" data-icon="key"><span class="ja-path-who">Both papers ready?</span><span class="ja-path-what">Combine Paper 1 and Paper 2</span></a>
</div>
<p>Related reading: <a href="/jee-mock-test-platform">a JEE mock test platform for JEE Main</a>, <a href="/math-test-maker">a math test maker with equations</a>, <a href="/chemistry-question-paper-maker">a chemistry question paper maker</a>, <a href="/cbt-exam-software">CBT exam software</a> and <a href="/prevent-cheating-in-online-exams">how to prevent cheating in online exams</a>.</p>
`),
        ],
        sources: [
            {
                label: 'JEE Advanced',
                links: [
                    { label: 'JEE (Advanced) 2026, official site (IIT Roorkee)', href: 'https://jeeadv.ac.in/' },
                    { label: 'Exam pattern and marking scheme (Careers360)', href: 'https://engineering.careers360.com/articles/jee-advanced-exam-pattern' },
                    { label: 'Exam pattern 2026 (ALLEN)', href: 'https://allen.in/jee-advanced/exam-pattern' },
                ],
            },
            {
                label: 'JEE Main, for comparison',
                links: [
                    { label: 'JEE Main (NTA)', href: 'https://jeemain.nta.nic.in/' },
                    { label: 'Our JEE mock test platform guide', href: 'https://testoza.com/jee-mock-test-platform' },
                ],
            },
            {
                label: 'Notation',
                links: [
                    { label: 'KaTeX', href: 'https://katex.org/' },
                    { label: 'mhchem', href: 'https://mhchem.github.io/MathJax-mhchem/' },
                ],
            },
        ],
    },
};
