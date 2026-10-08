/**
 * testoza.com/ssc-mock-test-platform — how a coaching institute (or a teacher, or a serious
 * aspirant) runs SSC mocks that behave like the 2026 exams: the new 15-minute sectional timer
 * of CGL and CHSL Tier 1, the patterns of CGL Tier 2, MTS and GD, +2 / −0.5 marking and when a
 * guess pays, Hindi and English on one paper, bringing old papers in, a test series for a
 * batch, reading a result section by section, a software checklist, mistakes and honest
 * limits. Written for SSC coaching institutes and faculty, with TestoZa as the worked example.
 *
 * Outside facts (sources in `sources`, checked 8 October 2026):
 *   - CGL 2026 Tier 1 from 30 September to 30 October 2026, CBT; 100 questions, 200 marks,
 *     60 minutes; from 2026 each of the four sections has its own 15 minutes and closes when
 *     they end (CGLE 2026 notice, as reported by Testbook, PW, Practicemock, SSC Drishti);
 *     +2 / −0.5; Hindi and English, English Comprehension in English. Testbook reports
 *     28,52,665 applications and 10,731 vacancies (revised from 12,256).
 *   - CHSL 2026 notice (7 September 2026): the same 15-minute sectional timer in Tier 1;
 *     Tier 2 subject timings; answer-key challenge fee down from ₹100 to ₹50 a question.
 *     Selection Post Phase 14 (2026): the same 15-minute sections.
 *   - Coaching sources report that a candidate who finishes a section early waits for its
 *     time to end; the page says so as reported and tells readers to follow the exam's own
 *     instructions.
 *   - CGL 2026 Tier 2 Paper I: Maths 30 Q / 30 min, Reasoning 30 Q / 30 min, English 45 Q /
 *     40 min, GA 25 Q / 20 min, Computer 20 Q / 15 min (qualifying), DEST 15 min; +3 / −1.
 *   - MTS: Session I 40 Q / 45 min, no negative; Session II 50 Q / 45 min, −1; +3 each.
 *   - GD Constable: 80 Q, 160 marks, 60 min, one clock, +2 / −0.25.
 *   - Normalisation: SSC notice of 2 June 2025 moved multi-shift exams to an equipercentile
 *     method (Careers360), replacing the formula of 7 February 2019.
 *
 * TestoZa claims checked against the code on 8 October 2026:
 *   - Timed sections (utils/sectionTiming.ts, TestPage.tsx, TestBuilder.tsx, TestIntroPage.tsx,
 *     CorporateTestView.tsx), shipped with this guide: builder switch "Time each section" under
 *     "Split into sections", minutes per section, time limit = their sum. On the exam screen
 *     sections open in order; the clock shows the open section's time; other sections' tabs
 *     and palette numbers are faded and answer with a toast; Save & Next stops at the
 *     section's last question; Back at its first; when time ends the next section opens
 *     ("X is closed. Y has started: 15 min."). Works for join-code sittings and resumed
 *     attempts (schedule from time left). Extra time from the examiner lengthens the open
 *     section. Off with the practice "no time limit" option. Enforced in the browser.
 *   - "Randomize Questions" now shuffles within each section (TestPage processTestData).
 *   - Results: score card, correct / wrong / partial / skipped, Subject-Wise Split per section
 *     (score, correct, wrong, skipped; "Skipped" label fixed with this guide), time per
 *     question; rank estimate for tests tagged SSC (ResultsPage isRankPredictorSupported).
 *   - Everything else (marks per test / section / question with decimals, NTA-style screen,
 *     palette states, calculator off unless switched on, Hindi typing in English letters,
 *     AI import English / Hindi / both, join-code sittings, exam rules and rank list on paid
 *     plans from ₹49 a week): as checked for the Hindi, CBT, conduct and JEE Advanced guides.
 *   - NOT in the product: a Hindi / English switch on the exam screen, regional languages,
 *     typing or data-entry tests, normalisation across shifts, a ready-made SSC question
 *     bank, automatic PwBD compensatory time, server-side enforcement of section locks.
 */
import { SSC_META } from './meta';
import { DEMO_MARKS, DEMO_SECTION_SECONDS, DEMO_SECTIONS, MARKINGS, OPTION_KEYS, PATTERNS, guessValue } from './sscData';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const signed = (n: number) => {
    const r = Math.round(n * 1000) / 1000;
    return r > 0 ? `+${r}` : r < 0 ? `−${-r}` : '0';
};

/* ── Crawler versions of the demos ────────────────────────────────────── */

const PATTERNS_FALLBACK = PATTERNS.map(
    (p) => `
<h3>${p.name}</h3>
<p>${p.sections.reduce((s, x) => s + x.questions, 0)} questions, ${p.sections.reduce((s, x) => s + x.marks, 0)} marks, ${p.minutes} minutes. Right ${p.right}, wrong ${p.wrong}. ${p.languages}. ${p.note}</p>
<div class="sg-table-wrap"><table class="sg-table">
<thead><tr><th scope="col">Section</th><th scope="col">Questions</th><th scope="col">Marks</th><th scope="col">Time</th></tr></thead>
<tbody>
${p.sections.map((s) => `<tr><th scope="row">${s.name}${s.note ? ` (${s.note.toLowerCase()})` : ''}</th><td data-label="Questions">${s.questions}</td><td data-label="Marks">${s.marks}</td><td data-label="Time">${s.minutes ? `${s.minutes} min` : p.timing === 'sessions' ? 'its session’s clock' : 'shared'}</td></tr>`).join('\n')}
</tbody>
</table></div>
<p>In TestoZa: ${p.setup.map((s) => `${s.label}: ${s.value}`).join('; ')}.</p>`,
).join('\n');

const PLANNER_FALLBACK = `
<p>A planner for one candidate in CGL Tier 1. Set the seconds a candidate needs per question and their accuracy in each section; it compares expected marks (+2 / −0.5) with one shared 60-minute clock and with 15 minutes per section. Take a candidate who needs 30 seconds a question in Reasoning (85% accurate), 15 in General Awareness (70%), 60 in Quantitative Aptitude (85%) and 30 in English (80%). With one clock they could attempt all 100 questions, moving the time saved in General Awareness to Quant, for about 150 expected marks. With 15-minute sections, Quant fits only 15 of its 25 questions, the 8¾ minutes saved in General Awareness are lost, and the expected score drops to about 134: some 16 marks lost to the timer alone. The fix is speed in the slow section: at 36 seconds a question all 25 fit.</p>`;

const EXAM_FALLBACK = `
<p>A twelve-question SSC CGL Tier 1 paper in four timed sections on TestoZa’s exam screen, +${DEMO_MARKS.plus} for a right answer and −${DEMO_MARKS.minus} for a wrong one. Each section has ${DEMO_SECTION_SECONDS} seconds in the demo (15 minutes in the real paper); the next section opens only when the open one’s time is up, a closed section can’t be reopened, and the result shows the score of every section. Questions are in English and Hindi, except English Comprehension.</p>
${DEMO_SECTIONS.map(
    (s) => `<h3>${s.name}</h3>
<ol>
${s.questions.map((q) => `<li>${q.plain} ${OPTION_KEYS.map((k) => `(${k}) ${q.options[k][0]}`).join(' ')} [Answer: ${q.answerPlain}.]</li>`).join('\n')}
</ol>`,
).join('\n')}`;

const GUESS_FALLBACK = `
<p>The average marks a single guess is worth, by marking scheme and by how many of the four options the candidate can rule out first:</p>
<div class="sg-table-wrap"><table class="sg-table">
<thead><tr><th scope="col">Marking</th><th scope="col">Blind guess (25%)</th><th scope="col">One ruled out (33%)</th><th scope="col">Two ruled out (50%)</th></tr></thead>
<tbody>
${MARKINGS.map((m) => `<tr><th scope="row">${m.label}: ${m.exams}</th>${[4, 3, 2].map((left) => `<td data-label="${left === 4 ? 'Blind' : left === 3 ? 'One out' : 'Two out'}">${signed(guessValue(m, left))}</td>`).join('')}</tr>`).join('\n')}
</tbody>
</table></div>
<p>Over ten blind guesses at +2 / −0.5, a candidate ends below zero about a quarter of the time (when one or none of the ten is right), even though the average is positive.</p>`;

/* ── The guide ─────────────────────────────────────────────────────────── */

export const SSC_MOCK_TEST_PLATFORM: Guide = {
    meta: SSC_META,
    body: {
        intro: [
            html(`
<p>SSC changed the clock in 2026. CGL Tier 1, which used to give candidates one hour for all 100 questions, now gives each of its four sections its own 15 minutes. When a section’s time is up it closes, the next one opens, and there is no going back. CHSL Tier 1 and the Selection Post exams follow the same rule. A candidate who used to finish General Awareness in seven minutes and spend the rest on Quant can’t do that any more: the eight minutes are simply lost.</p>
<p>For coaching institutes this is the biggest change to SSC preparation in years, and most mock tests haven’t caught up. A mock with one 60-minute clock now trains the wrong habit. This guide is about running SSC mocks that behave like the real 2026 papers: what each exam’s pattern is, what sectional timing changes for candidates (with a planner you can try), how to build and run the mock, Hindi and English on one paper, negative marking and when a guess pays, a test series for a batch, and how to read a result section by section. Every demo on this page works, including a short CGL Tier 1 paper whose sections close on their own.</p>
<p>It is written for people who run SSC coaching, from a one-room centre in Patna or Prayagraj to a chain with branches in several cities, and for faculty who set the papers. TestoZa is the worked example. We added timed sections to it for exactly this reason, and we say plainly where it still falls short.</p>
`),
        ],
        answer:
            'A good SSC mock test platform runs the 2026 pattern exactly: CGL and CHSL Tier 1 as four sections of 15 minutes that open one after another and close when their time ends, +2 for a right answer and −0.5 for a wrong one, questions in Hindi and English (English in English only), no calculator, and a result that shows every section’s score. It should also handle CGL Tier 2’s timed modules, MTS’s two sessions and GD’s single 60-minute clock. In TestoZa you split the test into sections, switch on “Time each section” and give each its minutes; candidates take it on a phone or a computer, with a join code for a centre.',
        sections: [
            {
                id: 'what-changed',
                title: 'What changed in SSC exams in 2026: a clock for every section',
                tocLabel: 'What changed in 2026',
                kicker: 'The 2026 pattern',
                blocks: [
                    html(`
<p>Until 2025, SSC CGL Tier 1 was 100 questions in 60 minutes on one clock. Candidates could start with any section, jump between them, and come back to a skipped question at minute 58. Most toppers had a fixed order (General Awareness first, because it is fast; Quant last, because it absorbs whatever time is left) and that order was most of their strategy.</p>
<p>From the 2026 cycle, the papers that matter most to SSC aspirants time every section separately:</p>
<div class="sg-table-wrap"><table class="sg-table">
<thead><tr><th scope="col">Exam</th><th scope="col">How the clock works</th><th scope="col">Marking</th></tr></thead>
<tbody>
<tr><th scope="row">CGL 2026 Tier 1</th><td data-label="Clock">Four sections, 15 minutes each, in a fixed order</td><td data-label="Marking">+2 / −0.5</td></tr>
<tr><th scope="row">CHSL 2026 Tier 1</th><td data-label="Clock">Four sections, 15 minutes each</td><td data-label="Marking">+2 / −0.5</td></tr>
<tr><th scope="row">Selection Post Phase 14</th><td data-label="Clock">Four sections, 15 minutes each</td><td data-label="Marking">+2 / −0.5</td></tr>
<tr><th scope="row">CGL and CHSL Tier 2</th><td data-label="Clock">Every module timed on its own (for CGL: 30, 30, 40, 20 and 15 minutes)</td><td data-label="Marking">+3 / −1</td></tr>
<tr><th scope="row">MTS and Havaldar</th><td data-label="Clock">Two sessions of 45 minutes</td><td data-label="Marking">+3; −1 in Session II only</td></tr>
<tr><th scope="row">GD Constable</th><td data-label="Clock">One 60-minute clock for all four sections</td><td data-label="Marking">+2 / −0.25</td></tr>
</tbody>
</table></div>
<p>Three rules follow from a sectional timer, and a mock has to enforce all three or it isn’t practice for the real thing:</p>
<ul class="sg-checks">
<li><strong>A section closes when its time ends.</strong> Unanswered questions stay unanswered; the next section opens on its own.</li>
<li><strong>No going back.</strong> A closed section can’t be reopened to change an answer or try a skipped question.</li>
<li><strong>No carrying time forward.</strong> Coaching sources that have sat the new pattern report that a candidate who finishes a section early waits for its time to run out. Minutes saved in General Awareness are gone; they don’t become extra minutes for Quant.</li>
</ul>
<p>The stakes are not small. Testbook reports about 28.5 lakh applications for CGL 2026 and roughly 10,700 vacancies. In a competition that size, a few marks lost to a badly managed section move a candidate thousands of places. Always check the instructions on the admit card and the first screen of the exam: they are the final word on the order and the rules.</p>
`),
                ],
            },
            {
                id: 'patterns',
                title: 'SSC exam patterns a mock has to copy',
                tocLabel: 'Exam patterns',
                kicker: 'The papers',
                blocks: [
                    html(`
<p>Each SSC exam has its own shape, and a mock that borrows CGL’s marking for MTS, or forgets that GD has no sectional timer, trains the wrong reflexes. Pick an exam below: you get its sections, how its clock works, the marking, the time per question, the languages, and the TestoZa settings that reproduce it.</p>
`),
                    { type: 'widget', widget: 'ssc-patterns', fallbackHtml: PATTERNS_FALLBACK },
                    html(`
<p>A few details are easy to get wrong:</p>
<ul>
<li><strong>Time per question is now per section.</strong> CGL Tier 1 still averages 36 seconds a question, but it is now 36 seconds inside each section. A candidate can no longer be slow in Quant and fast in General Awareness and come out even.</li>
<li><strong>English is English only.</strong> The other sections are printed in Hindi and English; the English section is not. A bilingual mock should leave it in English.</li>
<li><strong>MTS is two papers in one sitting.</strong> Session I (maths and reasoning) has no negative marking; Session II (general awareness and English) takes off one mark. In TestoZa make each session one section with its own 45 minutes, and set the marks per section, so the two subjects of a session share its clock as they do in the exam.</li>
<li><strong>CGL Tier 2 ends with a typing task.</strong> The 15-minute Data Entry Speed Test is a keyboard test, not a multiple-choice paper; practise it separately.</li>
<li><strong>Calculators are not allowed in any SSC CBT.</strong> Leave the scientific calculator off (it is off unless you switch it on).</li>
</ul>
`),
                ],
            },
            {
                id: 'sectional-strategy',
                title: 'How 15-minute sections change preparation',
                tocLabel: 'Sectional strategy',
                kicker: 'Strategy',
                blocks: [
                    html(`
<p>Under one clock, a candidate’s weakness could hide behind a strength. Under four clocks it can’t. The planner below makes this concrete for one candidate: set how many seconds they need per question and how accurate they are in each section, and compare their expected marks under the old and new patterns.</p>
`),
                    { type: 'widget', widget: 'ssc-planner', fallbackHtml: PLANNER_FALLBACK },
                    html(`
<p>What this means for teaching:</p>
<ul class="sg-checks">
<li><strong>Every section needs its own speed target.</strong> 25 questions in 15 minutes is 36 seconds a question, and that target now applies to Quant as much as to General Awareness. The candidate in the planner doesn’t need more maths; they need faster maths: shortcut methods, approximation, recognising question types on sight.</li>
<li><strong>Fast sections no longer subsidise slow ones.</strong> A candidate who finishes General Awareness in seven minutes should use the remaining eight to check doubtful answers in that section, because the time can’t go anywhere else.</li>
<li><strong>The order is set for them.</strong> Section-order strategies (“GA first, Quant last”) are gone. Mocks should run the sections in the exam’s order so candidates get used to starting cold on whatever comes first.</li>
<li><strong>A bad section is contained.</strong> The upside: a disastrous Quant section can’t eat into English any more. Candidates should practise letting a section go when its time is up and starting the next one fresh.</li>
<li><strong>Skipping is a decision with a deadline.</strong> In a 15-minute section there is no “come back at the end”. Candidates need a rule, such as skipping any question they can’t start in 20 seconds, and the mock is where they learn it.</li>
</ul>
<p>Sectional drills help: a single 15-minute, 25-question section run as its own test, three or four times a week, does more for section speed than a full mock once a week. Then the full mocks check that speed holds when the four sections come back to back.</p>
`),
                ],
            },
            {
                id: 'build',
                title: 'Building an SSC mock in TestoZa, step by step',
                tocLabel: 'Building the mock',
                kicker: 'Building',
                blocks: [
                    html(`
<p>An SSC mock is a normal TestoZa test with sections, marks and timed sections switched on. Here is the order that saves the most time, for a CGL Tier 1 mock:</p>
<ol class="sg-steps">
<li><strong>Get the questions in.</strong> If you have them as a PDF or as photos (a previous shift’s paper, your own question bank, a printed booklet), <a href="/generate-with-ai">upload them</a> and let the AI type every question, in Hindi, English or both. To write new questions, open the <a href="/create-test">test builder</a>; its question card types Hindi from English letters, so “bharat ki rajdhani” becomes भारत की राजधानी.</li>
<li><strong>Split into sections.</strong> Switch on “Split into sections” and make four: General Intelligence and Reasoning, General Awareness, Quantitative Aptitude and English Comprehension, in the exam’s order. Candidates see them as tabs, and the result splits marks by section.</li>
<li><strong>Time each section.</strong> Switch on “Time each section” and give each 15 minutes. The test’s time limit becomes 60 minutes, the four added up, and candidates are told before they start that each section opens when the one before it ends.</li>
<li><strong>Set the marks.</strong> 2 for a right answer and 0.5 for a wrong one. Marks can be set for the test, a section or a single question, with decimals, so MTS’s 3 / 0 then 3 / 1 or GD’s 2 / 0.25 are one setting each.</li>
<li><strong>Leave the calculator off,</strong> as SSC does.</li>
<li><strong>Write the instructions.</strong> Put the marking and the timing in the test’s instructions in the exam’s own words, so candidates read the rules before the clock starts.</li>
<li><strong>Decide how it will be taken.</strong> Share a link for practice at home, or run it at a fixed time with a join code at your centre (more on that below). For a real-exam feel, switch on “Randomize Questions”: TestoZa shuffles questions within each section, so every section keeps its own questions and its own clock.</li>
<li><strong>Sit it yourself, on a phone and on a computer.</strong> Fifteen minutes as a candidate catches a missing answer key, a Hindi line that wraps badly and the section you forgot to time.</li>
</ol>
<p>Here is how the SSC papers map onto TestoZa:</p>
<div class="sg-table-wrap"><table class="sg-table">
<thead><tr><th scope="col">Paper</th><th scope="col">Sections in TestoZa</th><th scope="col">Time each section</th><th scope="col">Marks / Wrong</th></tr></thead>
<tbody>
<tr><th scope="row">CGL or CHSL Tier 1</th><td data-label="Sections">4 subjects</td><td data-label="Timing">On: 15 min each</td><td data-label="Marks">2 / 0.5</td></tr>
<tr><th scope="row">CGL Tier 2 Paper I</th><td data-label="Sections">5 modules</td><td data-label="Timing">On: 30, 30, 40, 20, 15 min</td><td data-label="Marks">3 / 1</td></tr>
<tr><th scope="row">MTS</th><td data-label="Sections">2 sessions, each with both its subjects</td><td data-label="Timing">On: 45 min each</td><td data-label="Marks">3 / 0, then 3 / 1</td></tr>
<tr><th scope="row">GD Constable</th><td data-label="Sections">4 subjects</td><td data-label="Timing">Off: one 60-minute clock</td><td data-label="Marks">2 / 0.25</td></tr>
<tr><th scope="row">A sectional drill</th><td data-label="Sections">1 subject, 25 questions</td><td data-label="Timing">Time limit 15 min</td><td data-label="Marks">2 / 0.5</td></tr>
</tbody>
</table></div>
`),
                ],
            },
            {
                id: 'try-it',
                title: 'Try it: a CGL Tier 1 paper whose sections close on their own',
                tocLabel: 'Try a timed paper',
                kicker: 'The exam screen',
                blocks: [
                    html(`
<p>SSC’s exam screen and TestoZa’s look alike on purpose: a question at a time, section tabs along the top, a numbered palette, Save &amp; Next, Mark for Review, a clock and a Submit button. With timed sections the clock shows the open section’s time, the other sections’ tabs and palette numbers are faded, and tapping them says why they won’t open.</p>
<p>The paper below has three questions in each section and gives each section ${DEMO_SECTION_SECONDS} seconds, so you can see one close without waiting fifteen minutes. Start it, answer a question or two, try to open a later section, then skip to Reasoning’s last seconds and watch it close.</p>
`),
                    { type: 'widget', widget: 'ssc-exam', fallbackHtml: EXAM_FALLBACK },
                    html(`
<p>Some details that matter in the hall:</p>
<ul>
<li><strong>The palette uses the familiar five states:</strong> not visited, not answered, answered, marked for review, and answered and marked for review. Every answered question is marked, flagged or not, as in India’s computer-based exams.</li>
<li><strong>Save &amp; Next stops at the end of a section.</strong> On the last question of a section, the next section is still closed, and the screen says so instead of moving on.</li>
<li><strong>A refresh or a dead phone doesn’t reopen a section.</strong> Which section is open is worked out from the time left, so a candidate who reloads the page, or continues a join-code sitting on another device, comes back to the right section with the right time.</li>
<li><strong>Extra time from the examiner goes to the open section.</strong> If you give a candidate five more minutes during a sitting (after a power cut, say), the section they are in gets longer; closed sections stay closed.</li>
</ul>
<p>On a computer in your lab the same paper uses the desktop layout above, with the palette beside the question as in the exam centre. On a phone the palette is behind a button, and everything else is the same.</p>
`),
                ],
            },
            {
                id: 'bilingual',
                title: 'Hindi and English on the same paper',
                tocLabel: 'Hindi and English',
                kicker: 'Language',
                blocks: [
                    html(`
<p>Most SSC aspirants read Hindi, and many switch between the two languages question by question: a Hindi-medium candidate checks the English of a GA question to be sure of a term, an English-medium one reads the Hindi of a tricky reasoning statement. SSC prints every section except English in both languages, and a mock for an Indian batch should do the same.</p>
<p>In TestoZa a bilingual question carries both languages in one question, the English and the Hindi one under the other, and every option the same way, much like a bilingual exam booklet. Three ways to get there:</p>
<ul>
<li><strong>AI import in both languages.</strong> Upload an English or a Hindi paper and choose the output language: the same as the material, English, Hindi, or both together. With both, the AI writes every question and option in the two languages, in the order you selected them.</li>
<li><strong>Type Hindi in English letters.</strong> The builder’s question card has an English | हिंदी switch: type “nimnalikhit” and press space, and it becomes निम्नलिखित. No Hindi keyboard, no Kruti Dev, nothing to install.</li>
<li><strong>Paste Unicode Hindi.</strong> Text copied from a Unicode document pastes as it is. Text from old Kruti Dev files doesn’t; our <a href="/hindi-online-test-maker">Hindi online test maker guide</a> explains why and what to do instead.</li>
</ul>
<p>Two habits keep a bilingual mock fair. Decide which language counts if the two versions differ (many bilingual exams, NEET among them, treat the English version as final), and say so in the instructions, and allow for length: a bilingual question is twice as long on a phone, so check the longest one on the smallest phone in your batch.</p>
`),
                ],
            },
            {
                id: 'negative-marking',
                title: 'Negative marking: when a guess is worth it',
                tocLabel: 'Negative marking',
                kicker: 'Marking',
                blocks: [
                    html(`
<p>SSC takes off a quarter of a right answer’s marks for every wrong one in Tier 1 (0.5 of 2), an eighth in GD (0.25 of 2) and a third in Tier 2 and MTS Session II (1 of 3). Those numbers decide whether a guess is worth it, and the answer is pure arithmetic: try the schemes below.</p>
`),
                    { type: 'widget', widget: 'ssc-guess', fallbackHtml: GUESS_FALLBACK },
                    html(`
<p>Three things follow:</p>
<ul class="sg-checks">
<li><strong>In Tier 1 and GD a blind guess is worth slightly more than a skip on average.</strong> At +2 / −0.5 each blind guess adds 0.125 marks on average; ruling out one option makes it 0.33, two options 0.75. But the average hides the spread: ten blind guesses still end below zero about a quarter of the time.</li>
<li><strong>In Tier 2 and MTS Session II a blind guess is worth exactly nothing on average.</strong> At +3 / −1, a blind guess and a skip are the same on average, so only guess after ruling out at least one option.</li>
<li><strong>In MTS Session I, never leave a question blank.</strong> There is no negative mark, so every guess can only add.</li>
</ul>
<p>A mock is only useful here if its marking is exact. A mock that marks Tier 1 at +1 / −0.25, or MTS Session I with a negative mark, teaches the wrong guessing habit. In TestoZa the marks are a setting per test, per section or per question, and every result (the candidate’s, the faculty’s analysis and the spreadsheet) uses the same marks.</p>
`),
                ],
            },
            {
                id: 'previous-papers',
                title: 'Bringing previous papers and your question bank in',
                tocLabel: 'Previous papers',
                kicker: 'Questions',
                blocks: [
                    html(`
<p>An SSC institute usually has more questions than time to type them: last year’s shift papers as PDFs, a printed question bank, chapter-wise booklets, photos of a paper from the class WhatsApp group. Retyping a 100-question bilingual paper by hand takes a faculty member most of a day.</p>
<p><a href="/generate-with-ai">TestoZa’s AI import</a> takes PDFs and photos. It reads each question with its options, keeps the Hindi in Unicode, crops diagrams from figure-based reasoning questions (mirror images, paper folding, embedded figures), picks up the answer key where the paper prints one, and brings the sections back as sections. Choose “Extract” to keep the questions exactly as printed, or ask it to write new questions from a chapter or a topic list when you need fresh ones.</p>
<p>Check every imported paper once before it goes live, especially three things that matter more in SSC than elsewhere:</p>
<ul>
<li><strong>Answer keys.</strong> If the source is a candidate’s response sheet, the key is SSC’s final key only if you took it from the final answer key; tentative keys change after challenges.</li>
<li><strong>Figure questions.</strong> Make sure the crop includes all four option figures, and that the options are in the right order.</li>
<li><strong>Hindi spellings and numerals.</strong> Read the Hindi of a few questions in each section; a wrong mātrā changes a GK answer.</li>
</ul>
<p>Use past papers carefully. Strong candidates have seen many of them, and a mock made only of past questions measures memory as much as speed. A good full mock mixes new questions in the past papers’ style with a few past questions every candidate should know cold.</p>
`),
                ],
            },
            {
                id: 'test-series',
                title: 'Running an SSC test series for a batch',
                tocLabel: 'A test series',
                kicker: 'For institutes',
                blocks: [
                    html(`
<p>A test series is a teaching plan, not a pile of papers. With sectional timing the plan has to train each section’s speed on its own before it trains the full paper:</p>
<div class="sg-table-wrap"><table class="sg-table">
<thead><tr><th scope="col">Phase</th><th scope="col">What to run</th><th scope="col">How often</th><th scope="col">What it trains</th></tr></thead>
<tbody>
<tr><th scope="row">While topics are taught</th><td data-label="What to run">Topic tests, 20 to 25 questions, no section timer</td><td data-label="How often">After every topic</td><td data-label="What it trains">Accuracy and methods</td></tr>
<tr><th scope="row">Speed building</th><td data-label="What to run">Sectional drills: one section, 25 questions, 15 minutes</td><td data-label="How often">Three or four a week, each section in turn</td><td data-label="What it trains">36 seconds a question in every section, including the slow one</td></tr>
<tr><th scope="row">Full mocks</th><td data-label="What to run">The whole Tier 1 with timed sections</td><td data-label="How often">Weekly, then twice a week in the last month</td><td data-label="What it trains">Four sections back to back, letting a bad one go</td></tr>
<tr><th scope="row">Last two weeks</th><td data-label="What to run">Full mocks at the real shift time, in the centre, on computers</td><td data-label="How often">Every other day</td><td data-label="What it trains">Routine, and the screen of the exam centre</td></tr>
</tbody>
</table></div>
<h3>At home or in the centre</h3>
<p>Most practice happens at home, on a phone, from a shared link. For full mocks, run at least some in your centre at a fixed time: candidates join with a six-digit code and their roll number, without making an account, and you see who has joined and who has submitted, and, with exam rules switched on, who left the exam screen. If you have a computer lab, use it: SSC is sat on a desktop with a mouse, and the first time a candidate meets that screen should not be the exam. Our guide to <a href="/how-to-conduct-online-exam">conducting an online exam</a> covers the sitting step by step, and <a href="/prevent-cheating-in-online-exams">preventing cheating in online exams</a> covers full screen and tab-switch rules.</p>
<h3>Comparing two batches fairly</h3>
<p>If the morning and evening batches sit different papers, their raw marks aren’t comparable: one paper is always harder. SSC faces the same problem across its shifts and, since a notice of June 2025, normalises scores with an equipercentile method, which compares candidates by their percentile within their own shift. For your own series the simple fix is the same paper for every batch on the same day, or comparing candidates by rank within their batch rather than by raw marks.</p>
`),
                ],
            },
            {
                id: 'reading-results',
                title: 'Reading a mock result, section by section',
                tocLabel: 'Reading the result',
                kicker: 'After the mock',
                blocks: [
                    html(`
<p>An SSC score on its own says little. Two candidates on 130 out of 200 can need opposite advice: one is losing 12 marks to wrong answers in General Awareness, the other is attempting only 15 Quant questions because the section’s time runs out. The result has to tell them apart, and with sectional timing it has to do so per section.</p>
<p>Candidates get their result as soon as they submit: the score, correct, wrong and skipped answers, every section’s own score (the Subject-Wise Split you saw at the end of the demo), and the time spent on each question. For tests tagged SSC they can also ask for a rough rank estimate, which is a direction, not a prediction. Faculty get the batch view on the paid plans: a rank list, and for every question the share of candidates who chose each option, the accuracy and the average time.</p>
<p>For SSC, read five things after every full mock:</p>
<ul class="sg-checks">
<li><strong>Attempts per section.</strong> Fewer than about 20 of 25 in a section usually means speed, not knowledge, is the problem in that section.</li>
<li><strong>Marks lost to negatives.</strong> Wrong answers × 0.5. More than four or five marks a section means guessing without ruling anything out.</li>
<li><strong>Accuracy per section.</strong> Below about 80% on attempted questions, slow down before you speed up.</li>
<li><strong>Time on the slowest questions.</strong> Two or three questions taking over a minute each in a 15-minute section are the ones to skip next time.</li>
<li><strong>The trend, not the score.</strong> Section scores across the last five mocks say more than any single mock.</li>
</ul>
<p>The rank list, the full per-question analysis and the exam rules are part of the paid plans, which start at ₹49 a week; making and sharing tests, timed sections included, is free.</p>
`),
                ],
            },
            {
                id: 'checklist',
                title: 'A checklist for choosing an SSC mock test platform',
                tocLabel: 'Choosing a platform',
                kicker: 'Choosing',
                blocks: [
                    html(`
<p>Whatever you use, test it against the 2026 papers before you sell a test series on it. Ten questions to ask, with how TestoZa answers each:</p>
<div class="sg-table-wrap"><table class="sg-table">
<thead><tr><th scope="col">Ask</th><th scope="col">Why it matters</th><th scope="col">TestoZa</th></tr></thead>
<tbody>
<tr><th scope="row">Can each section have its own time, closing when it ends?</th><td data-label="Why">CGL and CHSL 2026 Tier 1 work this way</td><td data-label="TestoZa">Yes: Time each section</td></tr>
<tr><th scope="row">Is a closed section really closed, even after a refresh?</th><td data-label="Why">Otherwise candidates learn to cheat the clock</td><td data-label="TestoZa">Yes: the open section follows the time left</td></tr>
<tr><th scope="row">Can marks be +2 / −0.5, +2 / −0.25 and +3 / −1?</th><td data-label="Why">Every SSC exam marks differently</td><td data-label="TestoZa">Yes: per test, section or question, with decimals</td></tr>
<tr><th scope="row">Can one paper carry Hindi and English?</th><td data-label="Why">Most SSC aspirants read Hindi</td><td data-label="TestoZa">Yes: both on every question, typed or imported</td></tr>
<tr><th scope="row">Can you import old papers from PDFs and photos?</th><td data-label="Why">Retyping 100 bilingual questions takes a day</td><td data-label="TestoZa">Yes: AI import, Hindi included</td></tr>
<tr><th scope="row">Does the screen look like the SSC CBT?</th><td data-label="Why">The interface shouldn’t be new on exam day</td><td data-label="TestoZa">Yes: tabs, palette, Mark for Review, no calculator</td></tr>
<tr><th scope="row">Does it work on phones and lab computers?</th><td data-label="Why">Home practice is on phones; the exam is on a desktop</td><td data-label="TestoZa">Yes, both layouts</td></tr>
<tr><th scope="row">Is the result split by section?</th><td data-label="Why">With sectional timing, every section is its own problem</td><td data-label="TestoZa">Yes: Subject-Wise Split on every result</td></tr>
<tr><th scope="row">Can you run a mock at your centre at a fixed time?</th><td data-label="Why">Full mocks need exam conditions</td><td data-label="TestoZa">Yes: join code and roll number, no student accounts</td></tr>
<tr><th scope="row">Can you change the pattern yourself?</th><td data-label="Why">SSC changed it in 2026 and will again</td><td data-label="TestoZa">Yes: it is settings, not a fixed template</td></tr>
</tbody>
</table></div>
`),
                ],
            },
            {
                id: 'mistakes',
                title: 'Ten mistakes that make an SSC mock misleading',
                tocLabel: 'Ten mistakes',
                kicker: 'Mistakes',
                blocks: [
                    html(`
<ol class="sg-steps">
<li><strong>One 60-minute clock for a 2026 Tier 1 mock.</strong> It lets slow sections borrow time the real exam no longer gives.</li>
<li><strong>Sections in any order.</strong> The exam sets the order; practise starting with whatever comes first.</li>
<li><strong>Wrong marking.</strong> +1 / −0.25 instead of +2 / −0.5, or a negative mark in MTS Session I, teaches the wrong guessing habit.</li>
<li><strong>English-only papers for a Hindi-medium batch.</strong> Candidates practise reading, not reasoning.</li>
<li><strong>A calculator on screen.</strong> SSC doesn’t allow one; arithmetic speed is part of the test.</li>
<li><strong>Only full mocks.</strong> Speed in a slow section is built with sectional drills, several times a week.</li>
<li><strong>Only past papers.</strong> Your best candidates remember the answers.</li>
<li><strong>Raw marks across batches on different papers.</strong> Compare by rank within a batch, or give everyone the same paper.</li>
<li><strong>Never on a computer.</strong> The exam is sat with a mouse at a desk; practise that before exam day.</li>
<li><strong>No discussion afterwards.</strong> A score without a conversation about each section changes nothing in the next mock.</li>
</ol>
`),
                ],
            },
            {
                id: 'limits',
                title: 'Where TestoZa falls short for SSC (for now)',
                tocLabel: 'Honest limits',
                kicker: 'Honest limits',
                blocks: [
                    html(`
<ul class="sg-limits">
<li><strong>No language switch on the exam screen.</strong> A bilingual question shows both languages, one under the other; candidates can’t flip a question between Hindi and English as the SSC screen allows.</li>
<li><strong>Hindi and English only.</strong> MTS and GD are also offered in 13 regional languages; TestoZa’s AI writes in English and Hindi, and other languages have to be typed or pasted.</li>
<li><strong>No typing tests.</strong> CGL’s Data Entry Speed Test and CHSL’s typing test need a typing tool; TestoZa runs objective papers.</li>
<li><strong>No ready-made SSC question bank.</strong> You bring the questions (your own, or old papers through the AI import). TestoZa is the platform, not a test series.</li>
<li><strong>No normalisation across shifts.</strong> Results are raw marks and a rank within the test.</li>
<li><strong>PwBD compensatory time is not automatic.</strong> SSC gives eligible candidates 20 extra minutes for every hour; make a copy of the test with 20-minute sections for them.</li>
<li><strong>Section locks are enforced in the browser.</strong> They stop candidates in practice and in a supervised sitting; they are not proof against someone who edits a web page’s code. Answers are still marked on our server.</li>
<li><strong>AI needs a human check.</strong> Clean print reads very well; a faint photocopy or a blurry phone photo less so. Read every imported paper once.</li>
</ul>
`),
                ],
            },
        ],
        faqs: [
            {
                q: 'What is an SSC mock test platform?',
                a: 'Software for building and running mock tests that behave like SSC’s computer-based exams: the same sections and timing, the same marking (+2 / −0.5 in CGL and CHSL Tier 1), questions in Hindi and English, a CBT-style screen, and a result split by section. TestoZa is one, and runs in any browser on phones and computers.',
            },
            {
                q: 'Does SSC CGL 2026 have sectional timing?',
                a: 'Yes. In CGL 2026 Tier 1 each of the four sections has its own 15 minutes; a section closes when its time ends and you can’t go back to it, and unused time isn’t carried forward. CHSL 2026 Tier 1 and Selection Post Phase 14 use the same rule. Check your admit card and the exam’s instructions for the final word.',
            },
            {
                q: 'Can I make a mock test with sectional timing in TestoZa?',
                a: 'Yes. Split the test into sections, switch on “Time each section” and give each section its minutes (15 each for CGL or CHSL Tier 1). The time limit becomes the sum. On the exam screen the sections open one after another, the clock shows the open section’s time, and a closed section can’t be reopened.',
            },
            {
                q: 'What happens if a candidate finishes a section early?',
                a: 'They wait for the section’s time to run out, as reported for the 2026 exams; the next section opens only then. They can use the time to check answers in the open section, which is the only place it can be used.',
            },
            {
                q: 'How do I set +2 and −0.5 marking?',
                a: 'Set the marks to 2 and the wrong mark to 0.5 on the test, a section or a single question. Decimals are allowed, so GD’s 2 and 0.25, or MTS’s 3 with no negative in Session I and 1 in Session II, are one setting each.',
            },
            {
                q: 'Can the questions be in Hindi and English?',
                a: 'Yes. A question can carry both languages, the English and the Hindi one under the other, and every option the same way. Type Hindi in English letters in the builder, or let the AI import write both languages from an English or Hindi paper. There is no language switch on the exam screen.',
            },
            {
                q: 'Can I upload previous year SSC papers?',
                a: 'Yes. Upload PDFs or photos and the AI types each question with its options, keeps Hindi in Unicode, crops figures and brings back sections. Check the answer key and the figures once before the mock goes live.',
            },
            {
                q: 'Should candidates guess in SSC exams?',
                a: 'In CGL and CHSL Tier 1 (+2 / −0.5) a blind guess is worth +0.125 marks on average, and +0.33 after ruling out one option. In Tier 2 and MTS Session II (+3 / −1) a blind guess is worth nothing on average, so guess only after ruling out an option. In MTS Session I there is no negative marking, so never leave a question blank.',
            },
            {
                q: 'Can students take SSC mocks on a phone?',
                a: 'Yes. The same exam screen runs on phones and on computers. Run some full mocks on a computer too, because the real exam is sat at a desktop with a mouse.',
            },
            {
                q: 'How do I run a mock at my coaching centre?',
                a: 'Start a sitting for the test: candidates join with a six-digit code and their roll number, without accounts, and you see who has joined and who has submitted, can add time and can end the exam. Timed sections work the same way in a sitting.',
            },
            {
                q: 'Does TestoZa normalise marks like SSC?',
                a: 'No. SSC normalises across shifts with an equipercentile method; TestoZa shows raw marks and a rank within the test. To compare batches fairly, give them the same paper or compare ranks within each batch.',
            },
            {
                q: 'Is TestoZa free for SSC mocks?',
                a: 'Making tests, timed sections included, and sharing them is free. Paid plans, from ₹49 a week, add the full faculty analysis and rank lists, exam-security rules such as full screen and tab-switch warnings, institute branding and more result submissions.',
            },
        ],
        closingTitle: 'Run one 2026-pattern mock this week',
        closing: [
            html(`
<p>Don’t rebuild your whole test series. Take the next Tier 1 mock you were going to print or run on one clock, put it online with four sections of 15 minutes and +2 / −0.5, and run it for one batch. Then look at attempts per section before the discussion class. One mock with the real timer will tell you which candidates the 2026 change hurts, and which section to drill first.</p>
<div class="sg-paths">
<a class="sg-path" href="/generate-with-ai" data-icon="doc"><span class="sg-path-who">Have the paper as a PDF?</span><span class="sg-path-what">Upload it and let AI type it</span></a>
<a class="sg-path" href="/create-test" data-icon="pencil"><span class="sg-path-who">Writing your own questions?</span><span class="sg-path-what">Open the builder, time each section</span></a>
<a class="sg-path" href="/exams" data-icon="key"><span class="sg-path-who">Mock day at the centre?</span><span class="sg-path-what">Start a sitting with a join code</span></a>
</div>
<p>Related reading: <a href="/hindi-online-test-maker">a Hindi online test maker</a>, <a href="/cbt-exam-software">CBT exam software</a>, <a href="/how-to-conduct-online-exam">how to conduct an online exam</a>, <a href="/prevent-cheating-in-online-exams">how to prevent cheating in online exams</a> and <a href="/math-test-maker">a math test maker with equations</a>.</p>
`),
        ],
        sources: [
            {
                label: 'SSC',
                links: [
                    { label: 'Staff Selection Commission, official site', href: 'https://ssc.gov.in/' },
                    { label: 'CGL 2026 exam dates and applications (Testbook)', href: 'https://testbook.com/ssc-cgl-exam' },
                    { label: 'CGL 2026 pattern, sectional timing (PW)', href: 'https://www.pw.live/ssc/exams/ssc-cgl-exam-pattern' },
                    { label: 'What changed in CGL 2026 (SSC Drishti)', href: 'https://www.sscdrishti.com/blog/ssc-cgl-new-exam-pattern-2026-whats-changed' },
                    { label: 'Sectional timing strategy (Practicemock)', href: 'https://www.practicemock.com/blog/ssc-cgl-2026-sectional-timings-strategy/' },
                    { label: 'Changes in CHSL 2026 (Career Power)', href: 'https://www.careerpower.in/blog/5-big-changes-in-ssc-chsl-2026' },
                ],
            },
            {
                label: 'Other SSC exams',
                links: [
                    { label: 'MTS exam pattern (Careers360)', href: 'https://competition.careers360.com/articles/ssc-mts-exam-pattern' },
                    { label: 'GD Constable exam pattern (Career Power)', href: 'https://www.careerpower.in/ssc-gd-exam-pattern.html' },
                    { label: 'Selection Post Phase 14 sectional timing (Practicemock)', href: 'https://www.practicemock.com/blog/ssc-selection-post-phase-14-2026-new-sectional-timing-rules/' },
                ],
            },
            {
                label: 'Normalisation',
                links: [{ label: 'SSC adopts the equipercentile method (Careers360)', href: 'https://news.careers360.com/ssc-adopts-equipercentile-method-normalise-multi-shift-exam-scores-replaces-average-based-normalisation-cgl-admit-card-mts-vacancy' }],
            },
        ],
    },
};
