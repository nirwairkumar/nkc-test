/**
 * testoza.com/bank-exam-mock-test-platform — how a banking coaching institute (or a teacher,
 * or a serious aspirant) runs mocks that behave like IBPS, SBI and RRB papers: a clock for
 * every section, five options a question, marks that are rarely whole numbers, a quarter off
 * for a wrong answer, sectional cut-offs, Hindi and English on one paper, bringing old papers
 * in, a test series for a batch, reading a result section by section, a software checklist,
 * mistakes and honest limits. Written for bank coaching institutes and faculty, with TestoZa
 * as the worked example.
 *
 * Outside facts (sources in `sources`, checked 9 October 2026). Bank patterns are reported by
 * coaching sources that have read the notifications; the official PDFs on ibps.in and
 * sbi.bank.in are the final word, and the page says so wherever the sources disagree:
 *   - IBPS PO 2026 (CRP PO/MT-XVI): short notice 30 June 2026, detailed notification 1 July
 *     2026, vacancies revised up to about 7,565; Mains scheduled 4 October 2026. Prelims
 *     100 Q / 100 marks / 60 min with 20 minutes a section (English 30 Q, Quant 35 Q,
 *     Reasoning 35 Q); the 2026 revision is reported as English 30, Quant 30, Reasoning 40
 *     marks — the question counts agree across sources, the marks split does not.
 *     Mains revised to 170 Q / 200 marks / 160 min (Reasoning and Computer Aptitude 40/60/50,
 *     Data Analysis 40/60/45, Awareness 50/60/35, English 40/20/30), then a 25-mark, 30-minute
 *     descriptive paper; merit = Mains (out of 225) and interview, 80 : 20.
 *   - SBI PO 2026: Prelims English 40 Q / 40 marks, Quant 30/30, Reasoning 30/30, 20 min a
 *     section, reported to have no sectional cut-off. Mains 170 Q / 200 marks / 180 min
 *     (Reasoning 40/60/50, Data Analysis 30/60/45, Awareness 60/60/45, English 40/20/40) plus
 *     a descriptive paper reduced from 50 to 30 marks: three tasks chosen from six.
 *   - IBPS Clerk 2026: Prelims 100 Q / 100 marks / 60 min, 20 a section (English 30,
 *     Numerical 35, Reasoning 35); Mains revised to 160 Q / 200 marks / 125 min
 *     (Awareness 40/50/20, English 40/40/35, Reasoning and Computer 40/60/35, Quant 40/50/35);
 *     no interview. Prelims reported for 10–11 October 2026, Mains 27 December 2026.
 *   - IBPS RRB 2026 (CRP RRBs-XV, notified 1 September 2026, corrigendum 9 September):
 *     Office Assistant Prelims 80 Q / 80 marks / 45 min — Reasoning 40 Q / 25 min and
 *     Numerical Ability 40 Q / 20 min, so the sections are timed unequally; Mains 200 Q /
 *     200 marks / 120 min; about 13,745 indicative vacancies.
 *   - Negative marking is a quarter of the marks the question carries, in prelims and in the
 *     objective mains; nothing for a blank; none on the descriptive papers.
 *   - IBPS normalises multi-shift scores by equipercentile equating, as reported.
 *   - Coaching sources report an on-screen calculator in the Data Analysis section of Mains
 *     only, and no personal calculators; a claim that prelims Quant also shows one is
 *     disputed, so the page sends readers to the call letter.
 *
 * TestoZa claims checked against the code on 9 October 2026:
 *   - Timed sections (utils/sectionTiming.ts, TestPage.tsx, TestBuilder.tsx, TestIntroPage.tsx,
 *     CorporateTestView.tsx): builder switch "Time each section" under "Split into sections",
 *     minutes per section (any number, so 25 and 20 are fine), time limit = their sum.
 *     Sections open in order; the clock shows the open section's time; other sections' tabs and
 *     palette numbers are faded and answer with a toast; Save & Next stops at the section's
 *     last question; when time ends the next section opens. Enforced in the browser.
 *   - Five options: QuestionCard's "Add option" adds E (and more); TestPage renders whatever
 *     options a question has, so a five-option paper needs no special mode.
 *   - Marks: per test, per section (sections[].marks_per_question, sections[].negative_marks)
 *     and per question, with decimals, so 1.143 and 0.3125 are settable.
 *   - Attempt limit per section (sections[].attempt_control): "answer any 3 of 6", hard or
 *     soft, first-n or best-n — the closest thing to SBI's descriptive choice.
 *   - Scientific calculator: has_scientific_calculator, one switch for the whole test.
 *   - Results: score card, correct / wrong / partial / skipped, Subject-Wise Split per section,
 *     time per question (ResultsPage).
 *   - Everything else (NTA-style screen, palette states, Hindi typing in English letters,
 *     AI import English / Hindi / both with figure crops, join-code sittings, exam rules and
 *     rank list on paid plans from ₹49 a week): as checked for the Hindi, CBT, conduct, JEE
 *     Advanced and SSC guides.
 *   - NOT in the product: a Hindi / English switch on the exam screen, a calculator for one
 *     section only, typed descriptive answers, one passage or data set shared by a group of
 *     questions, sectional cut-offs marked automatically, normalisation across shifts, a
 *     ready-made bank question bank, server-side enforcement of section locks.
 */
import { BANK_META } from './meta';
import {
    CUTOFF_OVERALL,
    CUTOFF_SECTIONS,
    DEMO_MARKS,
    DEMO_SECTION_SECONDS,
    DEMO_SECTIONS,
    MARKINGS,
    OPTION_KEYS,
    PATTERNS,
    guessValue,
    marksLabel,
    perQuestionMarks,
    perQuestionNegative,
} from './bankData';
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
<p>${p.sections.reduce((s, x) => s + x.questions, 0)} questions, ${p.sections.reduce((s, x) => s + x.marks, 0)} marks, ${p.minutes} minutes, a clock for every section. A wrong answer costs a quarter of the marks the question carries. ${p.languages}. ${p.counts} ${p.note}</p>
<div class="bk-table-wrap"><table class="bk-table">
<thead><tr><th scope="col">Section</th><th scope="col">Questions</th><th scope="col">Marks</th><th scope="col">Time</th><th scope="col">Per question</th></tr></thead>
<tbody>
${p.sections
    .map(
        (s) =>
            `<tr><th scope="row">${s.name}${s.note ? ` (${s.note.toLowerCase()})` : ''}</th><td data-label="Questions">${s.questions}</td><td data-label="Marks">${s.marks}</td><td data-label="Time">${s.minutes} min</td><td data-label="Per question">+${marksLabel(perQuestionMarks(s))} / −${marksLabel(perQuestionNegative(s))}</td></tr>`,
    )
    .join('\n')}
</tbody>
</table></div>
${p.extra ? `<p>${p.extra}</p>` : ''}
<p>In TestoZa: ${p.setup.map((s) => `${s.label}: ${s.value}`).join('; ')}.</p>`,
).join('\n');

const PLANNER_FALLBACK = `
<p>A planner for one candidate in a 100-mark prelims paper of 30, 35 and 35 questions, one mark each and a quarter off for a wrong answer. Set the seconds the candidate needs per question and their accuracy in each section; it compares expected marks under one shared 60-minute clock with the same candidate under 20 minutes a section. Take a candidate who needs 25 seconds a question in English (75% accurate), 55 in Quantitative Aptitude (80%) and 30 in Reasoning (85%). With one clock they could move the seven and a half minutes saved in English into Quant, attempt 97 of the 100 questions, and expect about 73 marks. With 20-minute sections, Quant fits only 21 of its 35 questions, the saved minutes are lost, and the expected score falls to about 65: eight marks gone to the timer alone. The fix is speed in the slow section, not more time — Quant at 34 seconds a question fits all 35.</p>`;

const EXAM_FALLBACK = `
<p>A twelve-question IBPS PO Prelims paper in three timed sections on TestoZa’s exam screen, five options a question, +${DEMO_MARKS.plus} for a right answer and −${DEMO_MARKS.minus} for a wrong one. Each section has ${DEMO_SECTION_SECONDS} seconds in the demo (20 minutes in the real paper); the next section opens only when the open one’s time is up, a closed section can’t be reopened, and the result shows the score of every section. Quantitative Aptitude and Reasoning are in English and Hindi; the English Language section is in English only, as in the exam.</p>
${DEMO_SECTIONS.map(
    (s) => `<h3>${s.name}</h3>
<ol>
${s.questions.map((q) => `<li>${q.plain} ${OPTION_KEYS.map((k) => `(${k}) ${q.options[k][0]}`).join(' ')} [Answer: ${q.answerPlain}.]</li>`).join('\n')}
</ol>`,
).join('\n')}`;

const MARKING_FALLBACK = `
<p>Bank papers give five options, so a blind guess is right one time in five, and a wrong answer costs a quarter of whatever the question is worth. The average marks one guess is worth, by section and by how many of the five options the candidate can rule out first:</p>
<div class="bk-table-wrap"><table class="bk-table">
<thead><tr><th scope="col">Marking</th><th scope="col">Blind guess (20%)</th><th scope="col">One ruled out (25%)</th><th scope="col">Two ruled out (33%)</th><th scope="col">Three ruled out (50%)</th></tr></thead>
<tbody>
${MARKINGS.map(
    (m) =>
        `<tr><th scope="row">${m.label}: ${m.exams}</th>${[5, 4, 3, 2].map((left) => `<td data-label="${left === 5 ? 'Blind' : left === 4 ? 'One out' : left === 3 ? 'Two out' : 'Three out'}">${signed(guessValue(m, left))}</td>`).join('')}</tr>`,
).join('\n')}
</tbody>
</table></div>
<p>Every row is the same shape, because −¼ of the question’s marks against five options is the same bet whatever the question is worth: a blind guess is worth exactly zero, ruling out one option is worth a sixteenth of the question, two a sixth, and three three-eighths. What changes between sections is the size of the swing. In SBI’s Data Analysis section one lucky guess is +2 and one unlucky one is −0.5; in Mains English the same two guesses are +0.5 and −0.125. That is why a candidate should guess in the heavy sections first.</p>`;

const CUTOFF_FALLBACK = `
<p>A sectional cut-off lab. Set a candidate’s marks in each section of a 100-mark prelims paper and the qualifying mark for each section, and see whether they go through. The candidate starts on ${CUTOFF_SECTIONS.map((s) => s.score).join(' + ')} = ${CUTOFF_SECTIONS.reduce((a, s) => a + s.score, 0)} marks out of 100, which clears an overall cut-off of ${CUTOFF_OVERALL} with nine marks to spare — and is still rejected, because ${CUTOFF_SECTIONS[0].score} in ${CUTOFF_SECTIONS[0].name} is below that section’s qualifying mark of ${CUTOFF_SECTIONS[0].cutoff}. The same ${CUTOFF_SECTIONS.reduce((a, s) => a + s.score, 0)} marks spread 14 / 22 / 24 would qualify. In IBPS papers a candidate has to clear every section and the overall mark; SBI’s prelims is reported to have no sectional cut-off, which is why the same candidate can pass one exam and fail the other on identical marks.</p>`;

/* ── The guide ─────────────────────────────────────────────────────────── */

export const BANK_EXAM_MOCK_TEST_PLATFORM: Guide = {
    meta: BANK_META,
    body: {
        intro: [
            html(`
<p>A bank paper looks like one test and behaves like three. In IBPS PO Prelims the candidate gets 20 minutes for English, then 20 for Quantitative Aptitude, then 20 for Reasoning. Each section closes when its time ends. There is no going back, no carrying the four minutes saved in English into Quant, and no choosing the order. Then, in IBPS, each section has a qualifying mark of its own: a candidate can beat the overall cut-off by ten marks and still be rejected for one weak section.</p>
<p>Almost every mock test an institute runs gets at least one of those details wrong. A single 60-minute clock trains a habit the real exam punishes. Four options instead of five quietly changes the arithmetic of guessing. Whole-number marks cannot even express IBPS PO Mains 2026, where a Reasoning question is worth 1.5 marks and an English question 0.5. This guide is about running bank mocks that behave like the real papers: the patterns of IBPS, SBI and RRB as reported for 2026, what a 20-minute section does to a candidate, the marking and the five options, sectional cut-offs, Hindi and English on one paper, a test series for a batch, and how to read a result section by section.</p>
<p>It is written for people who run banking coaching — a one-room centre in Patna, Lucknow or Coimbatore as much as a chain with ten branches — and for the faculty who set the papers. TestoZa is the worked example throughout, and we say plainly where it still falls short.</p>
`),
        ],
        answer:
            'A bank exam mock test platform has to copy four things the real papers do: give every section its own clock (20 minutes each in IBPS and SBI prelims, 25 and 20 in RRB Office Assistant) and close it when the time ends; put five options on every question; allow decimal marks per section, because a Mains Reasoning question is worth 1.5 marks and an English one 0.5, with a quarter of that taken off for a wrong answer; and report every section separately, so sectional cut-offs can be checked. In TestoZa you split the test into sections, switch on “Time each section”, give each its minutes and its marks, and add a fifth option in the question card; candidates take it on a phone or a computer, with a join code for a sitting at your centre.',
        sections: [
            {
                id: 'three-tests',
                title: 'Why a bank mock is three tests, not one',
                tocLabel: 'Three tests, not one',
                kicker: 'The 2026 pattern',
                blocks: [
                    html(`
<p>Sectional timing is not new to banking the way it is new to SSC. IBPS and SBI have given each prelims section its own clock for years, and in 2026 the Clerk and RRB papers do the same. What is new is how much else moved with the 2026 notifications: IBPS PO Mains went from 145 objective questions to 170, lost its separate Computer Aptitude paper, grew General Awareness to 50 questions and cut English from 40 marks to 20. SBI shrank its descriptive paper from 50 marks to 30. IBPS Clerk Mains came down to 160 questions in 125 minutes.</p>
<p>Four properties of a bank paper decide whether a mock is practice or theatre:</p>
<ul class="bk-checks">
<li><strong>A clock for every section.</strong> It opens, it runs, it closes. Minutes saved in a fast section are lost, not banked, and a closed section cannot be reopened to change one answer.</li>
<li><strong>Five options, not four.</strong> Every IBPS and SBI objective question has five. A blind guess is right 20% of the time, not 25%, which is exactly the difference between a guess being worth nothing and being worth something.</li>
<li><strong>Marks that are not whole numbers.</strong> A section’s marks and its question count often differ: 40 questions for 60 marks is 1.5 each; 50 for 60 is 1.2; 40 for 20 is 0.5. A wrong answer costs a quarter of that — 0.375, 0.3, 0.125.</li>
<li><strong>Sectional cut-offs, in IBPS.</strong> Clearing the total is not enough; each section has its own qualifying mark. SBI’s prelims is reported to have none, which is one more reason a “bank mock” cannot be one generic thing.</li>
</ul>
<p>And the paper barely matters on its own: prelims marks never enter the merit list. IBPS PO merit is Mains out of 225 and the interview, 80 : 20; IBPS Clerk has no interview at all, so the Mains paper is the whole selection. With about 7,565 PO vacancies and roughly 13,745 in the RRBs against applications in the millions, a single section mismanaged by four marks moves a candidate thousands of places down the list.</p>
<p>Two warnings before any of the numbers below are used to set a paper. First, the official notification and the call letter are the final word; coaching summaries, including the ones we cite, disagree on details, and the 2026 marks split inside IBPS PO Prelims is one of them. Second, every figure here is the pattern as reported in October 2026 — check it again at the start of each cycle, because IBPS changed it twice in two years.</p>
`),
                ],
            },
            {
                id: 'patterns',
                title: 'Bank exam patterns a mock has to copy',
                tocLabel: 'Exam patterns',
                kicker: 'The papers',
                blocks: [
                    html(`
<p>“Bank exam” covers at least seven different papers, and the differences are the whole point. SBI gives English 40 questions in 20 minutes where IBPS gives 30; RRB Office Assistant times Reasoning for 25 minutes and Numerical Ability for 20; Clerk Mains gives General Awareness 40 questions and only 20 minutes. Pick a paper below and you get its sections, its clock, what each question is worth, what a wrong answer costs, the languages, and the TestoZa settings that reproduce it.</p>
`),
                    { type: 'widget', widget: 'bank-patterns', fallbackHtml: PATTERNS_FALLBACK },
                    html(`
<p>Details that are easy to get wrong, in order of how often we see them wrong:</p>
<ul>
<li><strong>Time per question is a section property, not a paper property.</strong> IBPS PO Prelims averages 36 seconds a question, but that average is useless: English gets 40 seconds a question, Quant and Reasoning 34. In Clerk Mains, Awareness gets 30 seconds and Quant 52.</li>
<li><strong>Awareness sections are deliberately starved of time.</strong> Twenty minutes for 40 questions is not an oversight; it tests recall, and a candidate who works out a General Awareness answer has already lost. Mocks should keep that ratio, or candidates will never learn to move on.</li>
<li><strong>Data Analysis is the heaviest paper in banking.</strong> SBI gives it 30 questions worth 60 marks: 2 marks each, 90 seconds each. Mark it at 1 and your candidates will triage the wrong section.</li>
<li><strong>English is English only.</strong> The other sections are printed in Hindi and English; the English paper is not. A bilingual mock should leave it in English.</li>
<li><strong>The descriptive papers are typed, in English, and not negatively marked.</strong> IBPS asks for an essay and a comprehension answer (25 marks, 30 minutes); SBI asks for three answers chosen from six tasks (30 marks, 30 minutes). Neither is a multiple-choice paper, and neither is something TestoZa runs — practise it on paper or in a word processor.</li>
<li><strong>The calculator is a section-level privilege.</strong> Coaching sources report an on-screen calculator in the Data Analysis section of Mains and nowhere else, with no personal calculators at any stage. Prelims is widely taught as calculator-free; one source claims otherwise, so read the call letter.</li>
</ul>
`),
                ],
            },
            {
                id: 'sectional-timing',
                title: 'What a 20-minute section does to a candidate',
                tocLabel: 'Sectional timing',
                kicker: 'Strategy',
                blocks: [
                    html(`
<p>Under one clock a weakness hides behind a strength: a candidate slow at Quant simply spends less time on Reasoning. Under three clocks it cannot. The planner below makes that concrete for one candidate. Set how many seconds they need per question and how accurate they are in each section, and compare their expected marks under a single 60-minute clock with the same candidate under 20-minute sections.</p>
`),
                    { type: 'widget', widget: 'bank-planner', fallbackHtml: PLANNER_FALLBACK },
                    html(`
<p>What follows for teaching:</p>
<ul class="bk-checks">
<li><strong>Every section needs its own speed target, in seconds.</strong> Not “be faster at Quant” but “34 seconds a question, 35 questions, 20 minutes”. Candidates who have never been given the number cannot hit it.</li>
<li><strong>The answer to a slow section is method, not minutes.</strong> The planner shows it: the candidate who needs 55 seconds a Quant question loses about eight marks to the clock, and no amount of extra practice time fixes that. Approximation, percentage-to-fraction tables, recognising a question type in five seconds and leaving the two set-based questions for the end do.</li>
<li><strong>Fast sections no longer subsidise slow ones.</strong> A candidate who finishes English in fourteen minutes should spend the remaining six re-reading their doubtful English answers, because the time cannot go anywhere else.</li>
<li><strong>The order is chosen for them.</strong> Section-order strategy is gone. Mocks should run the sections in the exam’s order so candidates get used to starting cold on whatever comes first — and in SBI’s prelims, that is 40 English questions in 20 minutes.</li>
<li><strong>A bad section is contained.</strong> The upside of the timer: a disastrous Quant cannot eat into Reasoning. Candidates have to practise letting a section go at its last second and starting the next one clean.</li>
<li><strong>Skipping is a decision with a deadline.</strong> In a 20-minute section there is no “come back at the end”. A workable rule is to leave any question the candidate cannot start inside ten seconds, and the mock is where that rule is learned.</li>
</ul>
<p>Sectional drills do most of the work: one section, its real question count, its real minutes, three or four times a week, moves section speed far more than one full mock a week. The full mocks then check that the speed survives three sections back to back.</p>
`),
                ],
            },
            {
                id: 'marks',
                title: 'Five options and decimal marks: where most test software breaks',
                tocLabel: 'Marks and guessing',
                kicker: 'Marking',
                blocks: [
                    html(`
<p>Here is a test for any platform you are considering. Ask it to mark IBPS PO Mains 2026: Reasoning at 1.5 marks a question with 0.375 off for a wrong answer, Data Analysis the same, General Awareness at 1.2 and 0.3, English at 0.5 and 0.125 — four different schemes in one paper, none of them whole numbers, all with five options. Most tools built for school tests cannot do it. Several can set marks per test but not per section. A few round 1.2 to 1, which is a 10-mark error on a 50-question section.</p>
<p>The marking also decides whether a guess is worth taking, and with five options the answer is cleaner than in any other Indian exam. Try it:</p>
`),
                    { type: 'widget', widget: 'bank-marking', fallbackHtml: MARKING_FALLBACK },
                    html(`
<p>Three things worth teaching from this:</p>
<ul class="bk-checks">
<li><strong>A blind guess among five options is worth exactly nothing.</strong> One right in five earns the question’s marks; four wrong cost a quarter each. It is a fair coin, so a blind guess neither helps nor hurts on average — but it adds variance, and on a sectional cut-off variance is a risk, not an opportunity.</li>
<li><strong>Elimination is the whole value of a guess.</strong> One option ruled out is worth a sixteenth of the question, two a sixth, three three-eighths. “Eliminate, then guess” is not a slogan; it is the only version of guessing that pays at all.</li>
<li><strong>Guess in the heavy sections.</strong> The bet is the same shape everywhere, but the stake is not. An eliminated-down guess in SBI’s Data Analysis is worth four times the same guess in Mains English, so when the last minute of a section arrives, spend it where the marks are.</li>
</ul>
<p>In TestoZa marks are a setting at three levels — the test, a section, or a single question — and they take decimals. Setting a bank paper means typing 1.5 and 0.375 for one section and 0.5 and 0.125 for another, and every result afterwards (the candidate’s, the faculty analysis, the exported spreadsheet) uses the same numbers. A fifth option is one tap: “Add option” in the question card adds E, and the exam screen simply shows five.</p>
`),
                ],
            },
            {
                id: 'build',
                title: 'Building an IBPS PO prelims mock, step by step',
                tocLabel: 'Building the mock',
                kicker: 'Building',
                blocks: [
                    html(`
<p>A bank mock is an ordinary TestoZa test with sections, timed sections, per-section marks and five options. In this order it takes about an hour for a 100-question paper you already have, and most of that hour is checking:</p>
<ol class="bk-steps">
<li><strong>Get the questions in.</strong> If the paper exists as a PDF or as photos — last year’s shift paper, your own bank, a printed booklet, a photo from the faculty WhatsApp group — <a href="/generate-with-ai">upload it</a> and let the AI type every question with its five options, in English, Hindi or both. To write fresh questions, open the <a href="/create-test">test builder</a>.</li>
<li><strong>Split into sections,</strong> in the exam’s order: English Language, Quantitative Aptitude, Reasoning Ability. Candidates see them as tabs, and the result splits marks by section.</li>
<li><strong>Time each section.</strong> Switch on “Time each section” and give each 20 minutes. The test’s time limit becomes 60, the three added up. For RRB Office Assistant, type 25 and 20 — the minutes do not have to match.</li>
<li><strong>Set the marks per section,</strong> not per test. For the 2026 PO prelims as reported, that is 1 and 0.25 for English, 0.857 and 0.214 for Quant, 1.143 and 0.286 for Reasoning. For a Clerk paper it is a flat 1 and 0.25, which is why a new series is easier to start there.</li>
<li><strong>Add the fifth option</strong> on each question (“Add option” in the question card) and mark the right answer. An imported paper already carries five.</li>
<li><strong>Leave the calculator off for prelims,</strong> and switch it on for a Mains Data Analysis drill — TestoZa’s switch covers the whole test, so a full Mains mock means choosing which way to be wrong, or splitting the paper (see the limits below).</li>
<li><strong>Write the instructions in the exam’s own words:</strong> five options, a quarter off for a wrong answer, the section order, 20 minutes each, no going back. Candidates should meet the rules before the clock starts, not during.</li>
<li><strong>Decide how it will be taken.</strong> Share a link for practice at home, or run it at a fixed time with a join code at your centre. For a real-exam feel switch on “Randomize Questions”: TestoZa shuffles within each section, so every section keeps its own questions and its own clock.</li>
<li><strong>Sit it yourself, on a phone and on a computer.</strong> Twenty minutes as a candidate catches a missing key, a Hindi line that wraps badly and the section you forgot to time.</li>
</ol>
<p>How the common papers map onto the settings:</p>
<div class="bk-table-wrap"><table class="bk-table">
<thead><tr><th scope="col">Paper</th><th scope="col">Sections</th><th scope="col">Time each section</th><th scope="col">Marks per question</th></tr></thead>
<tbody>
<tr><th scope="row">IBPS PO Prelims</th><td data-label="Sections">3</td><td data-label="Timing">20 / 20 / 20</td><td data-label="Marks">1 · 0.857 · 1.143</td></tr>
<tr><th scope="row">IBPS PO Mains (objective)</th><td data-label="Sections">4</td><td data-label="Timing">50 / 45 / 35 / 30</td><td data-label="Marks">1.5 · 1.5 · 1.2 · 0.5</td></tr>
<tr><th scope="row">SBI PO Prelims</th><td data-label="Sections">3</td><td data-label="Timing">20 / 20 / 20</td><td data-label="Marks">1 · 1 · 1</td></tr>
<tr><th scope="row">SBI PO Mains (objective)</th><td data-label="Sections">4</td><td data-label="Timing">50 / 45 / 45 / 40</td><td data-label="Marks">1.5 · 2 · 1 · 0.5</td></tr>
<tr><th scope="row">IBPS Clerk Prelims</th><td data-label="Sections">3</td><td data-label="Timing">20 / 20 / 20</td><td data-label="Marks">1 · 1 · 1</td></tr>
<tr><th scope="row">RRB Office Assistant Prelims</th><td data-label="Sections">2</td><td data-label="Timing">25 / 20</td><td data-label="Marks">1 · 1</td></tr>
<tr><th scope="row">A sectional drill</th><td data-label="Sections">1</td><td data-label="Timing">Time limit 20 min</td><td data-label="Marks">The section’s own</td></tr>
</tbody>
</table></div>
`),
                ],
            },
            {
                id: 'try-it',
                title: 'Try it: a prelims paper whose sections close on their own',
                tocLabel: 'Try a timed paper',
                kicker: 'The exam screen',
                blocks: [
                    html(`
<p>The IBPS screen and TestoZa’s look alike on purpose: one question at a time, section tabs along the top, a numbered palette with its five states, Save &amp; Next, Mark for Review, a clock, a Submit button. With timed sections the clock shows the open section’s time, the other tabs and their palette numbers are faded, and tapping them says why they will not open.</p>
<p>The paper below has four questions in each of three sections and gives each section ${DEMO_SECTION_SECONDS} seconds, so you can watch one close without waiting twenty minutes. Start it, answer a question, try to open Reasoning early, then skip to English’s last seconds.</p>
`),
                    { type: 'widget', widget: 'bank-exam', fallbackHtml: EXAM_FALLBACK },
                    html(`
<p>Details that matter in the hall:</p>
<ul>
<li><strong>Five options behave like five.</strong> The palette, the keyboard order and the result all treat E as an ordinary option, and “None of these” — the option bank exams love — needs no special handling.</li>
<li><strong>The palette uses the familiar five states:</strong> not visited, not answered, answered, marked for review, and answered and marked for review, as in every Indian computer-based test.</li>
<li><strong>Save &amp; Next stops at the end of a section.</strong> On the last question of the open section the screen says the next one opens when this one’s time is over, instead of moving on.</li>
<li><strong>A refresh or a dead phone does not reopen a section.</strong> Which section is open is derived from the time left on the paper’s clock, so a candidate who reloads, or continues a join-code sitting on another device, returns to the right section with the right time.</li>
<li><strong>Extra time from the examiner goes to the open section.</strong> Give a candidate five more minutes after a power cut and the section they are in gets longer; the closed ones stay closed.</li>
</ul>
<p>On a lab computer the same paper uses the desktop layout, with the palette beside the question as at the exam centre. On a phone the palette sits behind a button and everything else is identical.</p>
`),
                ],
            },
            {
                id: 'cutoffs',
                title: 'Sectional cut-offs: why the total is the wrong number',
                tocLabel: 'Sectional cut-offs',
                kicker: 'Qualifying',
                blocks: [
                    html(`
<p>This is the part of banking that surprises candidates from other exams. In IBPS papers a candidate must clear a qualifying mark in <em>every</em> section and the overall cut-off. A total nine marks clear of the overall mark counts for nothing if one section is a mark short. SBI’s prelims is reported to have no sectional cut-off, so the identical answer sheet can pass one exam and fail the other.</p>
<p>Move the marks and the cut-offs below and watch the verdict change. The cut-offs are yours to set — IBPS publishes them after the fact, and they move every year and every state — so use the lab to set the targets you will hold your batch to.</p>
`),
                    { type: 'widget', widget: 'bank-cutoff', fallbackHtml: CUTOFF_FALLBACK },
                    html(`
<p>Three consequences for how an institute runs its series:</p>
<ul class="bk-checks">
<li><strong>Publish section targets, not a total.</strong> “Sixty out of a hundred” is the wrong instruction. “At least 12 in English, 14 in Numerical, 16 in Reasoning” is an instruction a candidate can act on, and it is the shape the exam actually marks.</li>
<li><strong>The weakest section is the whole strategy.</strong> For most candidates that is English or Quant, and ten extra marks in Reasoning cannot buy a single mark of safety there. The counselling after a mock should start with the lowest section, not the total.</li>
<li><strong>Mock cut-offs should be set from your own batch.</strong> Rank the batch on each section, look at where the top 10× of your target intake falls, and use that. Last year’s published cut-off is a sanity check, not a target: IBPS normalises multi-shift scores by equipercentile equating, so the published numbers are not raw marks at all.</li>
</ul>
<p>TestoZa does not mark a sectional cut-off for you — results show every section’s score and the batch rank, and you read the cut-off off those. It is on our list; until then, one spreadsheet column per section does the job, and the exported results already carry the per-section marks.</p>
`),
                ],
            },
            {
                id: 'question-types',
                title: 'Data interpretation, puzzles and the sets bank exams are built on',
                tocLabel: 'Sets and puzzles',
                kicker: 'The questions',
                blocks: [
                    html(`
<p>Bank papers are unusual in how much of them comes in sets. A Data Interpretation table, bar chart or caselet carries five questions. A seating arrangement or a floor puzzle carries five. A reading comprehension passage carries eight to ten. In IBPS PO Mains, sets are most of the paper. Any platform you use has to handle three things about them.</p>
<p><strong>The shared stimulus.</strong> Five questions need to see the same table. TestoZa has no “one passage, five questions” object: each question carries its own text, so a set means repeating the table or the passage on each question of the set, or putting it in an image and attaching that image to each of the five. Both work and candidates read them normally; both mean the stimulus is stored five times, so a correction has to be made five times. For a DI table the image route is usually faster, and it also keeps the numbers aligned on a phone, which a pasted text table does not.</p>
<p><strong>Keeping a set together.</strong> Randomising questions would scatter a set across a section. TestoZa shuffles within a section, so the practical answer is to put each set in its own section when you need shuffling, or — far more commonly — leave shuffling off for papers built out of sets, which is what the real exams do anyway.</p>
<p><strong>Numbers and tables on a small screen.</strong> Most home practice happens on a phone. A five-column DI table that looks fine on a laptop becomes unreadable at 360 points wide. Check the widest table in every mock on the smallest phone in your batch before you publish, and prefer two tables of three columns to one of six.</p>
<p>The question types themselves are ordinary multiple choice with five options, which is all a prelims paper needs. Two kinds of bank question need more:</p>
<ul>
<li><strong>Quadratic comparison and “which is definitely true” inequalities</strong> are fine as single-answer questions, and the “None of these” / “Cannot be determined” fifth option matters for them — leave it in.</li>
<li><strong>Numerical-answer questions</strong> (type the value, no options) exist in TestoZa and are marked against the value, with a tolerance. Banking papers do not use them, but they are useful for Quant drills where you want to stop candidates working backwards from the options — which is a real exam skill, so use them for practice, not for mocks.</li>
</ul>
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
<p>IBPS and SBI print every section except English in Hindi and English, and a large share of bank aspirants move between the two question by question: a Hindi-medium candidate checks the English of a banking-awareness term, an English-medium one reads the Hindi of a knotty puzzle statement. A mock for an Indian batch should do the same.</p>
<p>In TestoZa a bilingual question carries both languages in one question — the English line and the Hindi line one under the other, and every option the same way — much like a bilingual exam booklet. Three ways to get there:</p>
<ul>
<li><strong>AI import in both languages.</strong> Upload an English or a Hindi paper and choose the output language: the same as the material, English, Hindi, or both together. With both, every question and every option comes back in the two languages.</li>
<li><strong>Type Hindi in English letters.</strong> The builder’s question card has an English | हिंदी switch: type “byaj dar” and press space and it becomes ब्याज दर. No Hindi keyboard, no Kruti Dev, nothing to install.</li>
<li><strong>Paste Unicode Hindi.</strong> Text from a Unicode document pastes as it is. Text from old Kruti Dev files does not; our <a href="/hindi-online-test-maker">Hindi online test maker guide</a> explains why and what to do instead.</li>
</ul>
<p>Two habits keep a bilingual mock fair. Say in the instructions which language is final if the two versions differ — bilingual exams generally treat the English version as authoritative — and allow for length: a bilingual question is twice as tall on a phone, so check the longest one in each section on the smallest phone your batch uses.</p>
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
<p>A banking institute normally has far more questions than time to type them: last year’s memory-based papers as PDFs, chapter-wise booklets, a decade of DI sets in a filing cabinet, photos from a class group. Retyping a 100-question bilingual paper with five options each by hand is most of a working day for a faculty member.</p>
<p><a href="/generate-with-ai">TestoZa’s AI import</a> takes PDFs and photos. It reads each question with all five options, keeps Hindi in Unicode, crops the figures out of DI charts and puzzle diagrams, picks up the answer key where the paper prints one, and brings sections back as sections. Choose “Extract” to keep the questions exactly as printed, or ask it to write fresh questions on a topic when you need new ones in a familiar style.</p>
<p>Check every imported paper once. Three checks matter more in banking than elsewhere:</p>
<ul>
<li><strong>The fifth option.</strong> Verify that E survived the import on every question and that “None of these” has not been dropped or merged into D.</li>
<li><strong>DI figures.</strong> Make sure the crop includes the whole table or chart, including its legend and units, and that it is attached to every question of the set.</li>
<li><strong>Numbers in Hindi.</strong> Check the digits and the units (₹, lakh, crore, per cent) in a few Hindi questions per section; a misread crore is a whole question wasted.</li>
</ul>
<p>Use memory-based papers carefully. Your strongest candidates have seen most of them, so a mock made only of past questions measures recall as much as speed. A good full mock is mostly fresh questions written in the papers’ style, with a handful of past ones every candidate ought to know cold.</p>
`),
                ],
            },
            {
                id: 'test-series',
                title: 'Running a bank test series for a batch',
                tocLabel: 'A test series',
                kicker: 'For institutes',
                blocks: [
                    html(`
<p>A test series is a teaching plan, not a pile of papers. Because bank selection is decided at Mains and gated at prelims, the plan has two separate jobs — speed first, then stamina:</p>
<div class="bk-table-wrap"><table class="bk-table">
<thead><tr><th scope="col">Phase</th><th scope="col">What to run</th><th scope="col">How often</th><th scope="col">What it trains</th></tr></thead>
<tbody>
<tr><th scope="row">While topics are taught</th><td data-label="What to run">Topic tests of 15 to 20 questions, no section timer</td><td data-label="How often">After each topic</td><td data-label="What it trains">Method and accuracy</td></tr>
<tr><th scope="row">Speed building</th><td data-label="What to run">Sectional drills: one section, its real questions, its real minutes</td><td data-label="How often">Three or four a week, sections in turn</td><td data-label="What it trains">The per-second target in every section, including the slow one</td></tr>
<tr><th scope="row">Prelims mocks</th><td data-label="What to run">The full prelims with timed sections</td><td data-label="How often">Weekly, twice a week in the last month</td><td data-label="What it trains">Three sections back to back; letting a bad one go</td></tr>
<tr><th scope="row">Mains mocks</th><td data-label="What to run">The objective paper by halves at first, then whole</td><td data-label="How often">Fortnightly, weekly after prelims</td><td data-label="What it trains">Stamina over 160 minutes, and triage between sections worth 0.5 and 1.5</td></tr>
<tr><th scope="row">Last two weeks</th><td data-label="What to run">Full mocks at the real shift time, in the centre, on computers</td><td data-label="How often">Every other day</td><td data-label="What it trains">Routine, and the screen of the exam centre</td></tr>
</tbody>
</table></div>
<h3>At home or at the centre</h3>
<p>Most practice happens at home on a phone, from a shared link. Run the full mocks at your centre at a fixed time: candidates join with a six-digit code and their roll number, without making an account, and you see who has joined and who has submitted, can add time, and — with exam rules switched on — who left the exam screen. If you have a computer lab, use it. Bank exams are sat at a desktop with a mouse, and the first time a candidate meets that screen should not be the exam. Our guides to <a href="/how-to-conduct-online-exam">conducting an online exam</a> and <a href="/prevent-cheating-in-online-exams">preventing cheating in online exams</a> cover the sitting and the rules step by step.</p>
<h3>Shifts, and comparing batches fairly</h3>
<p>Bank exams run in four shifts a day, which is why IBPS normalises scores across them — since 2025 by equipercentile equating, comparing a candidate against their own shift’s distribution. Your institute has the same problem in miniature: if the morning and evening batches sit different papers, their raw marks are not comparable, because one paper is always harder. The simple fixes are the same paper for every batch on the same day, or comparing candidates by rank within their own batch. TestoZa does not normalise, and neither should you pretend to.</p>
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
<p>A bank score on its own says almost nothing. Two candidates on 60 out of 100 can need opposite advice: one is losing eight marks to wrong answers in Reasoning, the other is attempting 21 of 35 Quant questions because the section runs out. With sectional cut-offs the result has to tell them apart per section, and it has to do so before the discussion class, not a week later.</p>
<p>Candidates get their result the moment they submit: the score, correct, wrong and skipped counts, every section’s own score in the Subject-Wise Split, and the time spent on each question. Faculty get the batch view on the paid plans — a rank list, and for every question the share of candidates who chose each option, the accuracy and the average time. For a five-option paper that option breakdown is the most useful number on the page: if 40% of the batch chose the same wrong option, the question is teaching something, and if 20% chose each, they were guessing blind.</p>
<p>After every full mock, read six things in this order:</p>
<ul class="bk-checks">
<li><strong>The lowest section against its cut-off.</strong> Everything else is secondary; this is what the exam rejects people for.</li>
<li><strong>Attempts per section.</strong> Well under the section’s question count means speed, not knowledge, is the problem there.</li>
<li><strong>Marks lost to wrong answers.</strong> Wrong × a quarter of the question’s marks. Above four or five marks in a section means guessing without eliminating.</li>
<li><strong>Accuracy on attempted questions.</strong> Below about 80%, slow down before speeding up — in a five-option paper, accuracy is cheaper to buy than speed.</li>
<li><strong>The slowest two or three questions.</strong> A 90-second question in a 20-minute section is the one to leave next time; candidates can almost never name it from memory, and the per-question times can.</li>
<li><strong>The trend, not the score.</strong> Section scores across the last five mocks say more than any single paper, and they are the only honest way to tell a candidate they are improving.</li>
</ul>
<p>The batch analysis, rank lists and exam-security rules are part of the paid plans, which start at ₹49 a week; making tests, timed sections included, and sharing them is free.</p>
`),
                ],
            },
            {
                id: 'checklist',
                title: 'A checklist for choosing a bank exam mock test platform',
                tocLabel: 'Choosing a platform',
                kicker: 'Choosing',
                blocks: [
                    html(`
<p>Whatever you use, test it against one real paper before you sell a test series on it. Build ten questions of IBPS PO Mains Reasoning and see how far you get. Twelve questions to ask, with how TestoZa answers each:</p>
<div class="bk-table-wrap"><table class="bk-table">
<thead><tr><th scope="col">Ask</th><th scope="col">Why it matters</th><th scope="col">TestoZa</th></tr></thead>
<tbody>
<tr><th scope="row">Can every section have its own time, closing when it ends?</th><td data-label="Why">Every bank prelims works this way</td><td data-label="TestoZa">Yes: Time each section</td></tr>
<tr><th scope="row">Can the sections have <em>different</em> lengths?</th><td data-label="Why">RRB Office Assistant is 25 and 20; Mains is 50 / 45 / 35 / 30</td><td data-label="TestoZa">Yes: minutes per section</td></tr>
<tr><th scope="row">Is a closed section really closed, even after a refresh?</th><td data-label="Why">Otherwise candidates learn to cheat the clock</td><td data-label="TestoZa">Yes: the open section follows the time left</td></tr>
<tr><th scope="row">Five options a question?</th><td data-label="Why">IBPS and SBI print five, and it changes the guessing maths</td><td data-label="TestoZa">Yes: Add option</td></tr>
<tr><th scope="row">Decimal marks, per section?</th><td data-label="Why">1.5, 1.2, 0.5 and 0.375 are a single Mains paper</td><td data-label="TestoZa">Yes: per test, section or question</td></tr>
<tr><th scope="row">Negative marks as a quarter of the question’s marks?</th><td data-label="Why">0.375 and 0.125 in the same paper</td><td data-label="TestoZa">Yes, set per section</td></tr>
<tr><th scope="row">Can one paper carry Hindi and English?</th><td data-label="Why">Every section but English is bilingual</td><td data-label="TestoZa">Yes: both on each question</td></tr>
<tr><th scope="row">Can you import old papers from PDFs and photos?</th><td data-label="Why">Retyping 100 bilingual five-option questions is a day’s work</td><td data-label="TestoZa">Yes: AI import, Hindi and figures included</td></tr>
<tr><th scope="row">Does the screen look like the bank CBT?</th><td data-label="Why">The interface should not be new on exam day</td><td data-label="TestoZa">Yes: tabs, palette, Mark for Review</td></tr>
<tr><th scope="row">Is the result split by section?</th><td data-label="Why">Sectional cut-offs are decided per section</td><td data-label="TestoZa">Yes: Subject-Wise Split on every result</td></tr>
<tr><th scope="row">Can you run a mock at your centre at a fixed time?</th><td data-label="Why">Full mocks need exam conditions</td><td data-label="TestoZa">Yes: join code and roll number, no student accounts</td></tr>
<tr><th scope="row">Can you change the pattern yourself?</th><td data-label="Why">IBPS changed it twice in two years</td><td data-label="TestoZa">Yes: it is settings, not a fixed template</td></tr>
</tbody>
</table></div>
`),
                ],
            },
            {
                id: 'mistakes',
                title: 'Ten mistakes that make a bank mock misleading',
                tocLabel: 'Ten mistakes',
                kicker: 'Mistakes',
                blocks: [
                    html(`
<ol class="bk-steps">
<li><strong>One 60-minute clock.</strong> It lets a slow section borrow time the real paper never gives, and it is the single most common mistake we see.</li>
<li><strong>Four options.</strong> It raises a blind guess from worthless to slightly profitable and teaches the wrong instinct for the last minute of a section.</li>
<li><strong>Whole-number marks on a Mains paper.</strong> Rounding 1.2 to 1 misreports a 50-question section by ten marks and hides which section is worth attacking.</li>
<li><strong>One marking scheme for the whole paper.</strong> Four sections, four schemes — anything else trains the wrong triage.</li>
<li><strong>Equal time for every section.</strong> Awareness gets 20 minutes for 40 questions on purpose; give it 35 and candidates will learn to think about it.</li>
<li><strong>Judging candidates on the total.</strong> With IBPS sectional cut-offs the lowest section is the verdict, and a counselling session that starts with the total misses it.</li>
<li><strong>Only full mocks.</strong> Section speed is built with drills several times a week; full mocks only measure it.</li>
<li><strong>Only memory-based papers.</strong> Your best candidates remember the answers, and you measure recall.</li>
<li><strong>DI tables nobody can read on a phone.</strong> Most practice is on a phone; check the widest table at 360 points before you publish.</li>
<li><strong>No discussion afterwards.</strong> A score without a conversation about the weakest section changes nothing in the next mock.</li>
</ol>
`),
                ],
            },
            {
                id: 'limits',
                title: 'Where TestoZa falls short for bank exams (for now)',
                tocLabel: 'Honest limits',
                kicker: 'Honest limits',
                blocks: [
                    html(`
<ul class="bk-limits">
<li><strong>No shared passage or data set.</strong> A DI table or a comprehension passage has to be repeated on each question of the set, or attached to each as an image. Candidates see it normally; you maintain it five times.</li>
<li><strong>The calculator is one switch for the whole test.</strong> The real Mains shows it in Data Analysis only. A full Mains mock means either a calculator everywhere or nowhere; running Data Analysis as its own 45-minute test is the honest workaround.</li>
<li><strong>No typed descriptive paper.</strong> IBPS’s essay and comprehension and SBI’s three-of-six tasks are keyboard papers; TestoZa runs objective ones. The per-section attempt limit (“answer any 3 of 6”) covers the choice, not the typing.</li>
<li><strong>Sectional cut-offs are not marked automatically.</strong> Results give every section’s score and the batch rank; you apply the cut-off yourself, in the exported sheet or by eye.</li>
<li><strong>No language switch on the exam screen.</strong> A bilingual question shows both languages one under the other; candidates cannot flip a single question between Hindi and English as the real screen allows.</li>
<li><strong>No normalisation across shifts.</strong> Results are raw marks and a rank within the test, not equated scores.</li>
<li><strong>No ready-made bank question bank.</strong> You bring the questions — your own, or old papers through the AI import. TestoZa is the platform, not a test series.</li>
<li><strong>Compensatory time is not automatic.</strong> Extra time for eligible candidates means a copy of the test with longer sections, or added time during a sitting.</li>
<li><strong>Section locks are enforced in the browser.</strong> They hold in practice and in a supervised sitting; they are not proof against someone editing a web page’s code. Answers are still marked on our server.</li>
<li><strong>AI import needs a human check.</strong> Clean print reads very well; a faint photocopy or a blurry phone photo less so. Read every imported paper once, especially the fifth option.</li>
</ul>
`),
                ],
            },
        ],
        faqs: [
            {
                q: 'What is a bank exam mock test platform?',
                a: 'Software for building and running mock tests that behave like the bank recruitment exams: a clock for every section, five options a question, the section’s own marks with a quarter taken off for a wrong answer, questions in Hindi and English, a CBT-style screen, and a result split by section so sectional cut-offs can be checked. TestoZa is one, and runs in any browser on phones and computers.',
            },
            {
                q: 'Do IBPS and SBI prelims have sectional timing?',
                a: 'Yes. In IBPS PO, SBI PO and IBPS Clerk prelims each of the three sections has its own 20 minutes within the 60-minute paper; a section closes when its time ends, you cannot go back, and unused time is not carried forward. IBPS RRB Office Assistant prelims is 25 minutes for Reasoning and 20 for Numerical Ability. Check your call letter for the final word.',
            },
            {
                q: 'How do I make a mock test with sectional timing?',
                a: 'In TestoZa, split the test into sections, switch on “Time each section” and give each section its minutes — 20 each for a prelims paper, or 50 / 45 / 35 / 30 for IBPS PO Mains. The test’s time limit becomes the sum. On the exam screen the sections open one after another, the clock shows the open section’s time, and a closed section cannot be reopened.',
            },
            {
                q: 'How many options do bank exam questions have?',
                a: 'Five. Every IBPS and SBI objective question gives five options, which is why a blind guess is right 20% of the time rather than 25%. In TestoZa, “Add option” in the question card adds a fifth, and the exam screen shows whatever options a question has.',
            },
            {
                q: 'What is the negative marking in bank exams?',
                a: 'A quarter of the marks the question carries, in prelims and in the objective Mains papers; nothing is deducted for a question left blank, and the descriptive papers are not negatively marked. Because Mains sections carry different marks per question, the deduction differs too: 0.375 on a 1.5-mark question, 0.3 on a 1.2-mark one, 0.125 on a 0.5-mark one.',
            },
            {
                q: 'Should candidates guess in bank exams?',
                a: 'A blind guess among five options is worth exactly nothing on average: one right in five earns the marks, four wrong cost a quarter each. Ruling out one option makes a guess worth a sixteenth of the question, two options a sixth, three options three-eighths. So the rule is eliminate first, then guess — and guess in the sections where questions are worth more.',
            },
            {
                q: 'Can I set decimal marks like 1.5 or 1.2 per section?',
                a: 'Yes. Marks and negative marks can be set for the test, for a section or for a single question, with decimals, so IBPS PO Mains 2026 — Reasoning 1.5 / 0.375, Data Analysis 1.5 / 0.375, Awareness 1.2 / 0.3, English 0.5 / 0.125 — is four section settings on one test.',
            },
            {
                q: 'What is a sectional cut-off, and does TestoZa check it?',
                a: 'In IBPS exams a candidate has to reach a qualifying mark in every section as well as the overall cut-off, so a high total with one weak section is still a rejection; SBI’s prelims is reported to have no sectional cut-off. TestoZa shows each section’s score and the batch rank on every result, but it does not mark a sectional cut-off for you — you apply your own targets to those numbers.',
            },
            {
                q: 'Can a mock carry Hindi and English questions?',
                a: 'Yes. A question can carry both languages — the English line and the Hindi line one under the other, and each option the same way. Type Hindi in English letters in the builder, or let the AI import write both languages from an English or a Hindi paper. Keep the English Language section in English only, as the exam does.',
            },
            {
                q: 'How do I put a data interpretation set into a mock?',
                a: 'Repeat the table or chart on each question of the set, or save it as an image and attach that image to each of the five questions. TestoZa has no single stimulus shared by a group of questions yet, so a correction has to be made on each question of the set. Leave question shuffling off for papers built out of sets.',
            },
            {
                q: 'Can students take bank mocks on a phone?',
                a: 'Yes — the same exam screen runs on phones and computers, and most home practice happens on a phone. Run some full mocks on a computer too, because the real exam is sat at a desktop with a mouse. Check the widest DI table on a small phone before publishing.',
            },
            {
                q: 'Is TestoZa free for bank mock tests?',
                a: 'Making tests — timed sections, five options and decimal marks included — and sharing them is free. Paid plans from ₹49 a week add the full faculty analysis and rank lists, exam-security rules such as full screen and tab-switch warnings, institute branding and more result submissions.',
            },
        ],
        closingTitle: 'Run one real-pattern mock this week',
        closing: [
            html(`
<p>Do not rebuild your series. Take the next prelims mock you were going to run on one clock, put it online as three sections of 20 minutes with five options and the section’s own marks, and give it to one batch. Then, before the discussion class, look at attempts per section and the lowest section against your own cut-off. One mock with the real timer tells you which candidates the clock is beating and which section to drill first — which is more than a term of full-length papers on the wrong pattern.</p>
<div class="bk-paths">
<a class="bk-path" href="/generate-with-ai" data-icon="doc"><span class="bk-path-who">Have the paper as a PDF?</span><span class="bk-path-what">Upload it and let AI type it</span></a>
<a class="bk-path" href="/create-test" data-icon="pencil"><span class="bk-path-who">Writing your own questions?</span><span class="bk-path-what">Open the builder, time each section</span></a>
<a class="bk-path" href="/exams" data-icon="key"><span class="bk-path-who">Mock day at the centre?</span><span class="bk-path-what">Start a sitting with a join code</span></a>
</div>
<p>Related reading: <a href="/ssc-mock-test-platform">an SSC mock test platform</a>, <a href="/cbt-exam-software">CBT exam software</a>, <a href="/hindi-online-test-maker">a Hindi online test maker</a>, <a href="/how-to-conduct-online-exam">how to conduct an online exam</a> and <a href="/prevent-cheating-in-online-exams">how to prevent cheating in online exams</a>.</p>
`),
        ],
        sources: [
            {
                label: 'IBPS',
                links: [
                    { label: 'Institute of Banking Personnel Selection, official site', href: 'https://www.ibps.in/' },
                    { label: 'IBPS PO 2026 pattern, prelims and revised mains (Practicemock)', href: 'https://www.practicemock.com/blog/ibps-po-exam-pattern/' },
                    { label: 'IBPS PO 2026 notification and vacancies (Practicemock)', href: 'https://www.practicemock.com/blog/ibps-po-notification-2026/' },
                    { label: 'IBPS PO syllabus and revised pattern (Adda247)', href: 'https://www.adda247.com/jobs/ibps-po-syllabus/' },
                    { label: 'IBPS Clerk 2026 pattern and sectional timing (Practicemock)', href: 'https://www.practicemock.com/blog/ibps-clerk-exam-pattern/' },
                    { label: 'IBPS RRB 2026 notification and pattern (Practicemock)', href: 'https://www.practicemock.com/blog/ibps-rrb-notification/' },
                ],
            },
            {
                label: 'SBI',
                links: [
                    { label: 'State Bank of India careers', href: 'https://sbi.bank.in/web/careers' },
                    { label: 'SBI PO 2026 exam pattern (Oliveboard)', href: 'https://www.oliveboard.in/sbi-po-exam-pattern/' },
                    { label: 'SBI PO 2026 mains pattern and descriptive paper (Practicemock)', href: 'https://www.practicemock.com/blog/sbi-po-mains-exam-pattern-2026/' },
                ],
            },
            {
                label: 'Normalisation and the calculator',
                links: [
                    { label: 'IBPS normalisation by equipercentile equating (Practicemock)', href: 'https://www.practicemock.com/blog/ibps-po-normalization-process-2025/' },
                    { label: 'The on-screen calculator in IBPS PO Mains (Practicemock)', href: 'https://www.practicemock.com/blog/in-built-calculator-ibps-po-mains/' },
                ],
            },
        ],
    },
};
