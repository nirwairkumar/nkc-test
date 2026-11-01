/**
 * testoza.com/neet-online-test-software — what NEET online test software has to
 * do, how institutes build and run full NEET mocks, the +4/−1 arithmetic, and what
 * aspirants get. Written for NEET faculty, coaching institutes and aspirants.
 *
 * Exam facts (sources in `sources`, checked 1 October 2026):
 *   - NTA press release, 16 July 2026: close to 20 lakh appeared in the 21 June
 *     re-exam, 11.21 lakh qualified, 13 languages, OMR sheets; 90,780 scored 500+,
 *     10,160 scored 600+ (so ~806 candidates per mark between 500 and 600).
 *   - 3 May exam cancelled 12 May (guess paper overlapping up to 120 questions);
 *     Pradhan, 15 May: "From next year, the NEET examination will happen in CBT
 *     mode"; 5 August affidavit: migration "under active consideration", Nilekani
 *     task force to advise, adequate notice; 30 September: report still awaited.
 *   - Re-exam ran 2:00–5:15 p.m. (15 minutes added for time lost to checks).
 *   - Pattern: 180 compulsory single-correct questions, 45 each in Physics,
 *     Chemistry, Botany, Zoology; +4/−1/0. 2021–2024: optional Section B (10 of 15),
 *     200 questions in 200 minutes; removed by NTA's notice of 25 January 2025.
 *   - Question formats counted by ALLEN for the re-exam.
 *
 * Product claims checked against the code on 1 October 2026:
 *   - Exam screen (pages/TestPage.tsx, Standard Mode = 'nta', the default in
 *     TestSettingsPanel): palette states Not Visited / Not Answered / Answered /
 *     Review / Ans & Review; Back, Clear, Review, Ans & Review, Save & Next; section
 *     tabs; timer can be hidden except under 5 minutes (red); connection dot by Exit;
 *     phones open the palette from a round button. Signed-in students' answers are
 *     kept on the device (localStorage + IndexedDB AnswerVault) and pushed to the
 *     server every 2 minutes; interrupted tests can be resumed; submission retries.
 *     Time up locks answering and shows a Submit dialog.
 *   - Tables render as HTML tables with a full-screen button (ui/LatexRenderer.tsx);
 *     option images (optionImages); Sy Pad Tables → Match List; mhchem.
 *   - AI import (pages/AITestImporter.tsx, components/ai-import): PDFs, Word,
 *     PowerPoint, photos, camera; Extract vs Generate; Easy / Moderate / Tough;
 *     Same as Material / English / Hindi (both = bilingual); custom instructions;
 *     separate answer-key upload "to auto-match correct answers"; live processing
 *     screen (Upload, Read pages, Write questions, Final touches); review screen
 *     with "still need an answer", Generate more, Edit, Save & continue.
 *   - Fill from photo, Hindi typing, attempt control (hard / first N / best N),
 *     marks at test / section / question level: see jeeMockTestPlatform.ts.
 *   - Teacher analysis (pages/FullTestAnalysisPage.tsx): Total Students, Avg Score
 *     (+ median), High / Low, Avg Time, Avg Accuracy; Speed vs. Accuracy quadrant
 *     (accuracy ≥ 60 %, time vs the batch median): Mastery, Deep Thinkers, Impulsive
 *     Guessers, At-Risk; per question accuracy, option breakdown, avg time,
 *     discrimination index (top vs bottom 27 %).
 *   - Student results (pages/ResultsPage.tsx, results/BehavioralTimeMatrix.tsx):
 *     score / max and %, subject marks, Correct / Wrong / Partial / Skipped, Predict
 *     your rank for tests tagged NEET, Subject-Wise Split, time matrix quadrants
 *     Fast & Accurate, Slow & Accurate, Fast & Careless, Time Traps / Stuck; AI mentor.
 *   - NOT in the product: OMR printing or scanning. Don't claim it.
 */
import { NEET_META } from './meta';
import { MINI_MOCK, MITOCHONDRION_LABELS, type MiniMockQuestion } from './neetMiniMock';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** One mini-mock question as plain HTML, with its answer, for crawlers. */
function questionHtml(q: MiniMockQuestion): string {
    const parts = [`<p><strong>Question ${q.id} · ${q.section} · ${escapeText(q.format)}.</strong> ${escapeText(q.lead)}</p>`];
    if (q.statements) parts.push(`<p>${q.statements.map(escapeText).join('<br>')}</p>`);
    if (q.table) {
        const rows = q.table.rows.map(([a, b]) => `<tr><td>${escapeText(a)}</td><td>${escapeText(b)}</td></tr>`).join('');
        parts.push(`<table><thead><tr><th>${escapeText(q.table.head[0])}</th><th>${escapeText(q.table.head[1])}</th></tr></thead><tbody>${rows}</tbody></table>`);
    }
    if (q.figure === 'mitochondrion') parts.push(`<p>Diagram: a mitochondrion labelled ${MITOCHONDRION_LABELS}.</p>`);
    if (q.tail) parts.push(`<p>${escapeText(q.tail)}</p>`);
    const options = (Object.entries(q.options) as [string, string][]).map(([k, v]) => `<li>(${k}) ${escapeText(v)}</li>`).join('');
    parts.push(`<ul>${options}</ul>`);
    parts.push(`<p>Answer: (${q.answer}). ${escapeText(q.why)}</p>`);
    return parts.join('\n');
}

const EXAM_FALLBACK = `
<p>The demo is a six-question NEET mini-mock on TestoZa’s exam screen, timed at six minutes and marked +4 for a right answer and −1 for a wrong one. The questions, with answers:</p>
${MINI_MOCK.map(questionHtml).join('\n')}`;

const PLANNER_FALLBACK = `
<p>A planner for the three hours. NEET allows an average of 60 seconds a question. One common plan: Biology first, 90 questions in 75 minutes (50 seconds each); then Chemistry, 45 questions in 45 minutes (60 seconds each); then Physics, 45 questions in 50 minutes (about 67 seconds each), leaving 10 minutes to revisit questions marked for review.</p>`;

const AI_FALLBACK = `
<p>Three photographed pages of the NCERT Class 11 Biology chapter on photosynthesis go into TestoZa’s AI test generator in Generate mode, at Moderate difficulty, with the instruction “NEET pattern, four options, include Statement I/II and Assertion–Reason questions”. The processing screen shows the stages (Upload, Read pages, Write questions, Final touches), a progress meter, the time elapsed and each question as it is written, with its type, the page it came from and the correct option highlighted.</p>`;

const BATCH_FALLBACK = `
<p>An example from the question audit after a NEET mock. Question 118 (Zoology, “which statement about human blood is incorrect?”): 34% of the batch answered correctly; 52% chose option B, “neutrophils are the most abundant white blood cells”, a true statement they believed false because they thought lymphocytes were the most common; average time 48 seconds; discrimination index 0.41. Question 64 (Chemistry, VSEPR shapes): 81% correct, discrimination 0.22. Question 27 (Physics, projectile motion): 46% correct, average time 94 seconds, the batch’s biggest time sink. Question 142 (Zoology): discrimination −0.08, where weaker students did better than stronger ones, a sign of an ambiguous question or a wrong key.</p>`;

const SCORE_FALLBACK = `
<p>A NEET score is 4 × (right answers) − 1 × (wrong answers). Example: 150 right and 20 wrong out of 180 gives 600 − 20 = 580 out of 720. For guessing, the expected value of answering a question you are unsure about is 4p − (1 − p), where p is your chance of being right: +0.25 marks for a blind guess among four options, +0.67 after ruling out one option, +1.5 after ruling out two. The break-even chance is 20%.</p>`;

const RESULT_FALLBACK = `
<p>The top of a TestoZa results page after a full NEET mock: the score out of 720 and the percentage, marks for Physics, Chemistry, Botany and Zoology, counts of correct, wrong, partly correct and skipped questions, a “Predict your rank” button on tests tagged NEET, and a subject-wise split with correct, wrong and skipped questions for each subject.</p>`;

export const NEET_ONLINE_TEST_SOFTWARE: Guide = {
    meta: NEET_META,
    body: {
        intro: [
            html(`
<p>NEET-UG is the largest single exam in India. Close to 20 lakh candidates sat it in June 2026, and every one of them answered the same 180 questions in about three hours. The marks bunch tightly. By NTA’s own result figures, 90,780 candidates scored 500 or more and 10,160 scored 600 or more: roughly 800 candidates for every mark in between. In that band, one wrong answer that should have been right costs five marks, and with them about four thousand ranks.</p>
<p>That arithmetic is why every serious NEET institute runs a test series, and why so many still run it the slow way: printed papers, OMR sheets, a scanner if they’re lucky and a stack of answer sheets if they aren’t. Results take days, the analysis stops at a total, and now the format itself is in question. NEET is the only major NTA entrance exam still on pen and paper, and after the 2026 paper leak the Union Education Minister announced that it would move to computer-based testing from 2027. In August the Centre told the Supreme Court that the move is under active consideration, with the final call waiting on an expert task force.</p>
<p>This guide is for the people who have to prepare students for whichever exam turns up: NEET faculty, coaching institutes and aspirants studying on their own. It covers what NEET online test software has to do, how to build a full 180-question paper from NCERT pages and old papers with AI, how to run it for every batch, the +4/−1 arithmetic most students never work out, and where TestoZa fits and where it doesn’t. There’s a working NEET exam screen further down: six questions, six minutes, marked the NEET way.</p>
`),
        ],

        answer:
            'NEET online test software has to reproduce the exam and then explain the result. That means 180 single-correct questions in four sections (Physics, Chemistry, Botany and Zoology), +4 for a right answer and −1 for a wrong one, a three-hour timer, statement questions, List-I/List-II tables and Biology diagrams that display exactly, and an exam screen that works on a phone as well as in a computer lab. Afterwards it should give each student their time on every question and give teachers each question’s accuracy and how the batch split across the options. TestoZa does this in any browser: AI turns NCERT pages, PDFs and photos into questions, tests open in an NTA-style screen, scores are calculated on the server, and results arrive as each student submits. Building tests and running live exams is free; exam-security rules, scheduling and branding are on paid plans.',

        sections: [
            {
                id: 'the-paper',
                title: 'What a NEET paper asks of your software',
                tocLabel: 'The paper',
                kicker: 'Know the target',
                blocks: [
                    html(`
<p>Start with the target. NEET-UG is one paper, the same for every candidate, set by the National Testing Agency and offered in 13 languages: English, Hindi, Assamese, Bengali, Gujarati, Kannada, Malayalam, Marathi, Odia, Punjabi, Tamil, Telugu and Urdu. Since 2025 it has had no optional questions.</p>
<div class="ng-table-wrap"><table class="ng-table ng-table--pattern">
<caption>NEET-UG question paper, 2025 onwards</caption>
<thead><tr><th scope="col">Section</th><th scope="col">Questions</th><th scope="col">Marks</th></tr></thead>
<tbody>
<tr><th scope="row" data-subject="physics">Physics</th><td data-label="Questions">45</td><td data-label="Marks">180</td></tr>
<tr><th scope="row" data-subject="chemistry">Chemistry</th><td data-label="Questions">45</td><td data-label="Marks">180</td></tr>
<tr><th scope="row" data-subject="botany">Biology: Botany</th><td data-label="Questions">45</td><td data-label="Marks">180</td></tr>
<tr><th scope="row" data-subject="zoology">Biology: Zoology</th><td data-label="Questions">45</td><td data-label="Marks">180</td></tr>
</tbody>
<tfoot><tr><th scope="row">Total</th><td data-label="Questions">180</td><td data-label="Marks">720</td></tr></tfoot>
</table></div>
<dl class="ng-specs">
<div><dt>Time</dt><dd>3 hours (180 minutes). The June 2026 re-exam ran 15 minutes longer to make up for time lost to checks in the hall.</dd></div>
<div><dt>Marking</dt><dd>+4 for a right answer, −1 for a wrong one, 0 if left blank.</dd></div>
<div><dt>Questions</dt><dd>Single correct, four options, all compulsory.</dd></div>
<div><dt>Mode</dt><dd>Pen and paper with an OMR sheet in 2026. A computer-based test is under consideration for 2027.</dd></div>
</dl>
<p>Every question has one correct option, but the questions come in many shapes. ALLEN’s analysis of the June 2026 re-exam counted, in Biology alone, 8 statement-based questions, 8 match-the-column, 5 assertion–reason, 11 “choose the incorrect statement” and 14 fill-in-the-blanks. Physics and Chemistry carried assertion–reason and statement questions too. Old papers look different again: from 2021 to 2024 each subject had an optional Section B (answer any 10 of 15), and the paper ran 200 questions in 200 minutes. If your test series reuses them, the software has to handle that as well.</p>
<p>So NEET online test software has five jobs:</p>
<ol class="ng-list ng-list--num">
<li><strong>The shape of the paper.</strong> Four sections of 45, 180 compulsory questions, a three-hour clock and section-wise scores, plus the old Section B pattern when you reuse a 2021–2024 paper.</li>
<li><strong>The formats.</strong> Statements on separate lines, List-I and List-II as a real table, diagrams as clear images and chemical formulas with proper subscripts, on a phone as well as a monitor.</li>
<li><strong>The marking.</strong> +4, −1 and 0, calculated the same way for every student, on a server rather than in the student’s browser.</li>
<li><strong>The screen.</strong> Whatever 2027 brings, students should know a question palette, mark-for-review and an on-screen timer as well as they know an OMR sheet.</li>
<li><strong>The analysis.</strong> Time spent on every question for the student; the accuracy and option split of every question for the teacher.</li>
</ol>
<h3>The clock: one minute a question</h3>
<p>180 questions in 180 minutes is an average of 60 seconds each, but nobody spends it evenly. Many Biology questions are recall and careful reading and take well under a minute; Physics numericals and Physical Chemistry take longer. Teachers usually ask students to fix the order and the split before the exam and rehearse it in every mock, so that on the day the plan runs on habit. Try a split of your own:</p>
`),
                    { type: 'widget', widget: 'neet-time-planner', fallbackHtml: PLANNER_FALLBACK },
                ],
            },
            {
                id: 'omr-or-cbt',
                title: 'OMR today, a computer screen tomorrow: practise for both',
                tocLabel: 'OMR or CBT',
                kicker: 'The format question',
                blocks: [
                    html(`
<p>Until this year, preparing for the NEET format meant preparing for an OMR sheet. That’s no longer a safe assumption. Here is how 2026 went:</p>
<ol class="ng-timeline">
<li><time datetime="2026-05-03">3 May</time><span>NEET-UG is held on pen and paper for more than 22 lakh registered candidates.</span></li>
<li><time datetime="2026-05-12">12 May</time><span>NTA cancels the exam after a “guess paper” matching up to 120 of the 180 questions is found in circulation.</span></li>
<li><time datetime="2026-05-15">15 May</time><span>Union Education Minister Dharmendra Pradhan: “The root cause of this is Optical Mark Recognition (OMR) based examination. From next year, the NEET examination will happen in CBT (Computer-Based Test) mode.”</span></li>
<li><time datetime="2026-06-21">21 June</time><span>The re-exam is held on pen and paper again, from 2:00 to 5:15 p.m.</span></li>
<li><time datetime="2026-07-16">16 July</time><span>Results: close to 20 lakh appeared and 11.21 lakh qualified.</span></li>
<li><time datetime="2026-08-05">5 August</time><span>The Centre tells the Supreme Court that moving NEET to computer-based testing is “under active consideration”, that a task force led by Nandan Nilekani will advise first, and that candidates will get adequate notice.</span></li>
<li><time datetime="2026-09-30">30 September</time><span>The task force’s report is still awaited. The Education Ministry is drafting a national strategy for computer-based test centres.</span></li>
</ol>
<p>So the honest position for 2027 aspirants is this: probably a computer screen, possibly a new structure, and no confirmed details until NTA publishes the information bulletin. Students who have only ever filled bubbles will find a computer-based test different in small ways that cost time:</p>
<div class="ng-table-wrap"><table class="ng-table ng-table--compare">
<thead><tr><th scope="col">What changes</th><th scope="col">On an OMR sheet</th><th scope="col">On a computer-based test</th></tr></thead>
<tbody>
<tr><th scope="row">Reading</th><td data-label="OMR">A printed booklet you can flip through, underline and write on.</td><td data-label="CBT">One question at a time; long statements and tables may need scrolling.</td></tr>
<tr><th scope="row">Answering</th><td data-label="OMR">Darken a bubble with a ball-point pen. A darkened bubble can’t be changed, and whitener isn’t allowed.</td><td data-label="CBT">Click an option. You can change or clear it until you submit.</td></tr>
<tr><th scope="row">Keeping track</th><td data-label="OMR">Your own system of ticks and circles in the booklet.</td><td data-label="CBT">A palette that colours every question: not visited, not answered, answered, marked for review.</td></tr>
<tr><th scope="row">The clock</th><td data-label="OMR">The wall clock and the invigilator’s announcements.</td><td data-label="CBT">An on-screen countdown.</td></tr>
<tr><th scope="row">Rough work</th><td data-label="OMR">In the booklet, next to the question.</td><td data-label="CBT">On a sheet beside the keyboard, away from the question.</td></tr>
</tbody>
</table></div>
<p>None of this is hard. It just has to stop being new before exam day, and the only way to get there is timed mocks on the same kind of screen, often. Until NTA’s 2027 bulletin settles the question, the sensible plan for an institute is both: keep some pen-and-paper mocks for the OMR habit, and put the weekly tests on screen. Our <a href="/cbt-exam-software">CBT exam software guide</a> covers the computer-based side in detail.</p>
`),
                ],
            },
            {
                id: 'formats',
                title: 'Statements, match lists and diagrams: NEET formats on screen',
                tocLabel: 'Formats',
                kicker: 'Try it yourself',
                blocks: [
                    html(`
<p>This is where cheap online tests let NEET down. A Match List question pasted into a form becomes one long line, a Statement I/II question loses its line breaks, and diagrams arrive blurred or not at all. If a question looks different, it has become a different question.</p>
<p><strong>Try it here.</strong> Below is TestoZa’s exam screen running a six-question NEET mini-mock: assertion–reason, a quick numerical, a match list, a Statement I/II question, a diagram and a “choose the incorrect” question. Same buttons and question palette as a real test, six minutes on the clock and +4/−1 marking. Answer, mark for review, skip one, then submit.</p>
`),
                    { type: 'widget', widget: 'neet-exam-demo', fallbackHtml: EXAM_FALLBACK },
                    html(`
<h3>How each format is handled</h3>
<ul class="ng-list">
<li><strong>Statement I/II and assertion–reason.</strong> The statements stay on their own lines with their labels, and the four standard options keep NTA’s wording. When the AI extracts a paper, it keeps both as written.</li>
<li><strong>Match List-I with List-II.</strong> The two lists are a real table. In the test builder, the Sy Pad keyboard’s Tables tab has a ready-made Match List grid, and the AI writes tables as tables when it reads a paper. On a narrow phone the table scrolls sideways, and a small button opens it full screen.</li>
<li><strong>Diagrams.</strong> The AI cuts diagrams out of PDFs and photos and attaches each one to its question. You can also upload a picture or paste a screenshot, and an option can be a picture too.</li>
<li><strong>Chemistry and Physics notation.</strong> Formulas such as K₂Cr₂O₇, reactions with arrows and fractions are stored in LaTeX and its chemistry add-on, mhchem. Nobody has to learn either: the AI writes them when it reads your files, and the Sy Pad writes them as you tap. Our <a href="/jee-mock-test-platform">JEE guide</a> has a working Sy Pad to try.</li>
<li><strong>Hindi and bilingual papers.</strong> The AI can keep your material’s language or write the questions in English, Hindi or both. In the builder, Hindi can be typed with English letters.</li>
</ul>
<p>The screen around the question matters as much as the question. Standard Mode, the default for every TestoZa test, follows the NTA layout:</p>
<ul class="ng-checks">
<li>A colour-coded palette with NTA’s five states: not visited, not answered, answered, marked for review, and answered and marked for review.</li>
<li>Back, Clear, Review, Ans &amp; Review and Save &amp; Next, with subject tabs across the top.</li>
<li>A countdown students can hide, except in the last five minutes, when it stays on screen in red.</li>
<li>For signed-in students, answers are kept on the device as they work and sent to our server every two minutes, so a dropped connection or a closed tab doesn’t cost the mock; an interrupted test can be resumed. A dot beside Exit shows the connection.</li>
<li>On phones, the palette opens from a round blue button at the bottom right, exactly as in the demo above.</li>
</ul>
`),
                ],
            },
            {
                id: 'build',
                title: 'From NCERT page to NEET paper: building tests with AI',
                tocLabel: 'Build with AI',
                kicker: 'Step by step',
                blocks: [
                    html(`
<p>NEET is an NCERT exam. The syllabus is set by the National Medical Commission, and Biology questions in particular tend to come straight from a line, a table or a figure in the NCERT textbooks, which is why teachers tell students to read them line by line. That makes the textbook the best raw material for a test series, and it’s where AI saves the most time.</p>
<p>Open the <a href="/generate-with-ai">AI test generator</a>, upload PDFs, Word files, PowerPoint slides or photos (or use your phone’s camera), and pick a mode:</p>
<div class="ng-cards">
<article class="ng-card" data-icon="doc" data-tone="blue"><h3>Extract</h3>
<p>Keeps a paper exactly as it is: the wording, the options and the diagrams. Upload the answer key as a separate file and the correct answers are matched for you. Use it for previous years’ papers, test-series PDFs and DPPs.</p></article>
<article class="ng-card" data-icon="sparkles" data-tone="purple"><h3>Generate</h3>
<p>Writes new questions from a chapter, your notes or photographed NCERT pages, at the difficulty you pick: Easy, Moderate or Tough. An instructions box takes notes like “NEET pattern, four options, include three Statement I/II questions”.</p></article>
<article class="ng-card" data-icon="language" data-tone="orange"><h3>Language</h3>
<p>Same as your material, English, Hindi, or English and Hindi together for bilingual batches.</p></article>
</div>
<p>Here’s Generate at work on three photographed pages from the NCERT Class 11 Biology chapter on photosynthesis:</p>
`),
                    { type: 'widget', widget: 'neet-ai-import', fallbackHtml: AI_FALLBACK },
                    html(`
<p>Questions appear as they’re written, so you can start reading before the run ends. Then everything opens in a review screen that flags any question still missing an answer. <strong>Generate more</strong> adds questions to the same draft, <strong>Edit</strong> opens them in the builder, and <strong>Save &amp; continue</strong> turns them into a test.</p>
<h3>A full 180-question mock, start to finish</h3>
<ol class="ng-steps">
<li><strong>Gather the material.</strong> Last year’s paper, a test-series PDF, a Chemistry DPP, photos of the Biology chapters you finished this month.</li>
<li><strong>Import it with AI.</strong> Extract what you already have, with its answer key; Generate what you don’t. Most faculty mix the two.</li>
<li><strong>Turn on sections.</strong> Physics, Chemistry, Botany and Zoology, 45 questions each, so the exam shows subject tabs and the results split by subject.</li>
<li><strong>Set the marks once.</strong> +4 and −1 on the test. Every question inherits them unless you change a section or a single question.</li>
<li><strong>Set the clock and the screen.</strong> 180 minutes, Standard Mode and no calculator, as in NEET.</li>
<li><strong>Check it as a student.</strong> Open the paper in the exam screen and read every question once. AI reads well, not perfectly, and a dropped “not” or a misread label on a diagram changes a NEET answer.</li>
<li><strong>Go live.</strong> Publish it, or use Conduct to give one batch its own exam link.</li>
</ol>
<p>Reusing a 2021–2024 paper with Section B? Give each Section B its own section and switch on attempt control: stop students after ten answers, or let them answer all fifteen and count their first ten or their best ten. And for a single question, the <strong>Fill from photo</strong> button on every question card reads a printed or handwritten question, fills in the card and attaches any diagram. It marks an answer only if the photo shows one, and never solves the question to guess.</p>
`),
                ],
            },
            {
                id: 'institutes',
                title: 'Running a NEET test series for every batch',
                tocLabel: 'Institutes',
                kicker: 'For coaching institutes',
                blocks: [
                    html(`
<p>One mock is easy. The hard part is a test every week for every batch, from the Class 11 foundation batch to the droppers, with results students actually act on. A rhythm many institutes use:</p>
<div class="ng-table-wrap"><table class="ng-table ng-table--rhythm">
<thead><tr><th scope="col">Test</th><th scope="col">How often</th><th scope="col">Length</th><th scope="col">Where</th></tr></thead>
<tbody>
<tr><th scope="row">Chapter test</th><td data-label="How often">Every week</td><td data-label="Length">45 questions, 45 minutes</td><td data-label="Where">Students’ own phones, at home</td></tr>
<tr><th scope="row">Part test</th><td data-label="How often">Every two to four weeks</td><td data-label="Length">90 questions, 90 minutes</td><td data-label="Where">Phones or the computer lab</td></tr>
<tr><th scope="row">Full mock</th><td data-label="How often">Weekly in the last four months</td><td data-label="Length">180 questions, 3 hours, from 2 p.m.</td><td data-label="Where">A lab or a supervised hall, at the real exam time</td></tr>
</tbody>
</table></div>
<p>Every live exam gets its own link, and only you see the results. Paid plans add the controls a serious mock needs: full screen, a limit on tab switches, a scheduled exam window, a start form for roll numbers and batches, your institute’s name and logo on the exam screen, results held until you release them, and Excel export.</p>
<h3>What you see after the mock</h3>
<p>Scores are calculated as each paper arrives. The analysis page opens with the batch’s numbers (students, average and median score, highest and lowest, average time and accuracy) and then does two things an OMR total never could:</p>
<div class="ng-cards">
<article class="ng-card" data-icon="target" data-tone="green"><h3>Speed against accuracy</h3>
<p>Every student lands in one of four groups, by accuracy and by time against the batch median: Mastery, Deep Thinkers (accurate but slow), Impulsive Guessers (fast, with heavy negative marks) and At-Risk. Tap a group to filter the roster. In NEET terms, the Impulsive Guessers are the students losing ranks to −1s.</p></article>
<article class="ng-card" data-icon="chart" data-tone="indigo"><h3>Question by question</h3>
<p>For every question: its accuracy, the share of the batch that picked each option, the average time spent on it, and a discrimination index that shows whether it separated your strongest students from the rest.</p></article>
</div>
<p>Open a question to see how the batch split. This is the part faculty end up using most:</p>
`),
                    { type: 'widget', widget: 'neet-batch-audit', fallbackHtml: BATCH_FALLBACK },
                    html(`
<p>When most of a batch picks the same wrong option, that isn’t carelessness. It’s a misconception, and it tells you exactly what to reteach on Monday. A question with a discrimination index near zero or below, where weaker students did as well as or better than stronger ones, is usually ambiguous or wrongly keyed: check it before the rank list goes out. The <a href="/user-guide/conduct-exam">conduct-exam guide</a> walks through going live, and <a href="/online-test-for-coaching">TestoZa for coaching institutes</a> covers plans for larger teams.</p>
`),
                ],
            },
            {
                id: 'negative-marking',
                title: 'The +4/−1 arithmetic every NEET student should know',
                tocLabel: '+4 / −1',
                kicker: 'Marks and guessing',
                blocks: [
                    html(`
<p>A NEET score is simple: four marks for every right answer, minus one for every wrong one. 150 right and 20 wrong is 4 × 150 − 20 = 580. The interesting part is what that rule says about guessing, which students argue about constantly and rarely calculate.</p>
<p>Every NEET question has four options. Pick one at random and you’re right a quarter of the time, which is worth, on average, 4 × ¼ − 1 × ¾ = <strong>+0.25 marks</strong>. Rule out one option you know is wrong and the chance rises to a third: <strong>+0.67</strong>. Rule out two and it’s a coin toss: <strong>+1.5</strong>. The break-even point is a one-in-five chance of being right. Above it, answering pays on average; below it, a blank does.</p>
<p>So the maths says a guess usually pays, and the classroom says be careful. Both are right. NEET’s wrong options are written to attract students who half-know a topic, so a “guess” on something you’ve misunderstood can land far less often than one time in four. And an average is not a promise: across ten guesses you can easily come out behind. What settles it is your own hit rate on the questions you aren’t sure about, and that’s a number only mocks can give you.</p>
<p class="ng-note"><strong>Measure it.</strong> For three full mocks, write down on your rough sheet the number of every question you answer without being sure. After each test, check those questions in the solution key. If you’re right well over one time in five, keep answering them. If not, leave that kind of question blank on the day.</p>
`),
                    { type: 'widget', widget: 'neet-score-lab', fallbackHtml: SCORE_FALLBACK },
                ],
            },
            {
                id: 'students',
                title: 'What a NEET aspirant gets, with or without an institute',
                tocLabel: 'Students',
                kicker: 'For aspirants',
                blocks: [
                    html(`
<p>Not every aspirant has an institute’s test series, and even those who do run short of fresh papers in the last months. TestoZa works for a student on their own.</p>
<ul class="ng-list">
<li><strong>Make your own mocks.</strong> Photograph the NCERT pages you finished this week, or an old paper, and the AI turns them into a timed test. Keep it private, set +4/−1 and the timer, and take it on the NTA-style screen.</li>
<li><strong>Practise the screen on your phone.</strong> The palette, mark for review and the countdown become automatic, whichever format 2027 brings.</li>
<li><strong>See where the marks went.</strong> Your score out of 720, each subject’s marks, and your right, wrong and skipped questions, subject by subject.</li>
<li><strong>Find your time traps.</strong> A time matrix sorts every question into Fast &amp; Accurate, Slow &amp; Accurate, Fast &amp; Careless and Time Traps, so you can see which questions ate your minutes and which ones you rushed.</li>
<li><strong>Talk through your mistakes.</strong> An AI mentor on the results page knows which questions you got wrong and can explain them.</li>
<li><strong>Get a rough rank estimate.</strong> On tests tagged NEET, Predict your rank gives an AI estimate for your score based on past years. Treat it as a direction, not a promise.</li>
<li><strong>Retake and compare.</strong> Sign in and every attempt stays in your history, so you can see whether the tenth mock went better than the first.</li>
</ul>
<p>Here’s the top of a results page after a full NEET mock:</p>
`),
                    { type: 'widget', widget: 'neet-student-result', fallbackHtml: RESULT_FALLBACK },
                    html(`
<p>One piece of advice from the teachers we work with: take full mocks at 2 p.m., in one sitting, the way the exam runs, and take chapter tests whenever you like. Then spend as long reviewing a mock as you spent writing it. The review is where the marks are.</p>
`),
                ],
            },
            {
                id: 'checklist',
                title: 'Choosing NEET online test software: a checklist',
                tocLabel: 'Checklist',
                kicker: 'Before you pay anyone',
                blocks: [
                    html(`
<p>Whichever software you’re looking at, test it with a real NEET paper in hand. A demo with ten easy MCQs proves nothing. These are the questions to ask:</p>
<div class="ng-table-wrap"><table class="ng-table ng-table--check">
<thead><tr><th scope="col">What to check</th><th scope="col">Why it matters for NEET</th><th scope="col">On TestoZa</th></tr></thead>
<tbody>
<tr><th scope="row">Four sections of 45, +4/−1, scored on a server</th><td data-label="Why">Section scores drive revision; scores worked out in the browser can be tampered with.</td><td data-label="TestoZa" class="is-yes">Yes; marks per test, section or question.</td></tr>
<tr><th scope="row">An NTA-style palette with review states</th><td data-label="Why">Students should know a computer-based test screen before 2027.</td><td data-label="TestoZa" class="is-yes">Standard Mode, the default.</td></tr>
<tr><th scope="row">Match lists, statements and diagrams on a phone</th><td data-label="Why">A question that looks different is a different question.</td><td data-label="TestoZa" class="is-yes">Tables, images and chemistry notation; tables open full screen.</td></tr>
<tr><th scope="row">Questions from your own material</th><td data-label="Why">NEET follows NCERT closely; generic question banks drift.</td><td data-label="TestoZa" class="is-yes">AI Extract and Generate from PDFs, Word, slides and photos.</td></tr>
<tr><th scope="row">Hindi and bilingual papers</th><td data-label="Why">Many candidates sit NEET in Hindi.</td><td data-label="TestoZa" class="is-yes">English, Hindi or both.</td></tr>
<tr><th scope="row">Budget phones and patchy internet</th><td data-label="Why">Weekly tests happen at home, on whatever phone the student has.</td><td data-label="TestoZa" class="is-yes">Any browser; answers kept on the device and synced.</td></tr>
<tr><th scope="row">Question-level analysis</th><td data-label="Why">Reteaching needs the option split, not just a total.</td><td data-label="TestoZa" class="is-yes">Accuracy, option split, time and discrimination for every question.</td></tr>
<tr><th scope="row">Exam security</th><td data-label="Why">A full mock means little if answers are shared during it.</td><td data-label="TestoZa" class="is-part">Full screen, tab-switch limits and exam windows on paid plans.</td></tr>
<tr><th scope="row">Your data, your way out</th><td data-label="Why">Results should leave with you if you switch.</td><td data-label="TestoZa" class="is-part">Excel export on paid plans.</td></tr>
<tr><th scope="row">The price</th><td data-label="Why">A test series runs all year.</td><td data-label="TestoZa" class="is-yes">Building and running tests is free; paid plans by the week, month or year.</td></tr>
</tbody>
</table></div>
`),
                ],
            },
            {
                id: 'limits',
                title: 'Where TestoZa isn’t the right tool (yet)',
                tocLabel: 'Honest limits',
                kicker: 'Worth knowing',
                blocks: [
                    html(`
<ul class="ng-limits">
<li><strong>It doesn’t do OMR.</strong> TestoZa can’t print OMR sheets or scan them. For pen-and-paper mocks you’ll need a separate OMR tool until NEET’s format is settled.</li>
<li><strong>A browser isn’t a test centre.</strong> Full-screen and tab-switch rules make cheating harder, not impossible. Run the mocks that decide ranks in a supervised hall or lab.</li>
<li><strong>AI needs a human check.</strong> A dropped “not”, a misread label on a diagram or a wrong subscript changes a NEET answer. Read every paper once before it goes live.</li>
<li><strong>The rank estimate is an estimate.</strong> It comes from AI and past years’ trends, not from NTA, and a new exam format in 2027 makes past years a weaker guide.</li>
<li><strong>English and Hindi on request; other languages as written.</strong> The AI writes English or Hindi when you ask and keeps other languages as they appear in your material, but we haven’t checked every one of NEET’s 13 languages ourselves.</li>
<li><strong>Time’s up needs a tap.</strong> When the clock runs out, answering locks, but the student still confirms the submission.</li>
<li><strong>Some controls are paid.</strong> Exam-security rules, scheduling, start forms, branding, held results and Excel export come with the weekly, monthly or yearly plans on the <a href="/pricing">pricing page</a>. Building tests, AI import (with hourly limits), taking tests and live exam links are free.</li>
</ul>
<p>We’d rather you read these here than discover them in the middle of a mock.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'What is the best NEET online test software for coaching institutes?',
                a: 'Look for five things: the exact NEET pattern (four sections of 45, +4/−1, scored on a server), an NTA-style exam screen, statement, match-list and diagram questions that display correctly on phones, questions made from your own NCERT-based material, and question-level analysis for the whole batch. TestoZa does all five in any browser and is free to start; exam-security rules, scheduling and branding are on paid plans.',
            },
            {
                q: 'Will NEET 2027 be a computer-based test?',
                a: 'Probably, but it is not final. On 15 May 2026 the Union Education Minister said NEET would move to computer-based testing from 2027. On 5 August 2026 the Centre told the Supreme Court the move is under active consideration, pending a task force led by Nandan Nilekani, and that candidates will get adequate notice. As of 30 September 2026 the task force had not reported. Wait for NTA’s information bulletin, and practise on both OMR and a computer screen until then.',
            },
            {
                q: 'How many questions and marks are there in NEET-UG?',
                a: '180 compulsory questions for 720 marks: 45 each in Physics, Chemistry, Botany and Zoology. Every question has four options and one correct answer. A right answer earns 4 marks, a wrong one costs 1, and a blank scores 0. The paper normally runs 3 hours; the June 2026 re-exam allowed 3 hours 15 minutes.',
            },
            {
                q: 'Can I conduct a full 180-question NEET mock online with negative marking?',
                a: 'Yes. Create four sections of 45 questions, set +4 and −1 on the test and 180 minutes on the clock, keep Standard Mode (the NTA-style screen) and give your batch an exam link with Conduct. Scores are calculated on the server as each student submits, with a rank list and question-wise analysis.',
            },
            {
                q: 'Can I make NEET questions from NCERT textbooks with AI?',
                a: 'Yes. Photograph or upload NCERT pages in TestoZa’s AI test generator and choose Generate, with Easy, Moderate or Tough difficulty and instructions such as “NEET pattern, include Statement I/II questions”. Use Extract instead to keep an existing paper’s questions exactly, and upload its answer key to have the answers matched. Read the draft once before it goes live.',
            },
            {
                q: 'Does TestoZa support Match List, assertion–reason and diagram questions?',
                a: 'Yes. Match lists are real tables (the Sy Pad keyboard has a ready Match List grid, and the AI keeps tables when it reads a paper), statements stay on separate lines, and diagrams are attached as images, cropped automatically by the AI from PDFs and photos. Options can be images too.',
            },
            {
                q: 'Can students take NEET mock tests on a mobile phone?',
                a: 'Yes, in any modern browser with nothing to install. The question palette opens from a button at the bottom right, and signed-in students’ answers are kept on the device and synced, so a weak connection doesn’t lose the test. For full three-hour mocks, a laptop or a computer lab is closer to a computer-based exam.',
            },
            {
                q: 'Is guessing worth it in NEET?',
                a: 'On average a blind guess among four options is worth +0.25 marks (4 × ¼ − 1 × ¾), rising to +0.67 if you can rule out one option and +1.5 if you can rule out two. The break-even chance is 20%. But NEET’s wrong options are designed to attract half-prepared students, so measure your real hit rate on uncertain questions across a few mocks before deciding.',
            },
            {
                q: 'Can I create Hindi or bilingual NEET tests?',
                a: 'Yes. The AI can keep your material’s language or write the questions in English, Hindi or both. In the test builder, Hindi can be typed with English letters, so “namaste” becomes नमस्ते.',
            },
            {
                q: 'Does TestoZa print or scan OMR sheets?',
                a: 'No. TestoZa runs tests on screen, in an NTA-style computer-based format. For pen-and-paper practice you will need a separate OMR tool.',
            },
            {
                q: 'Is TestoZa free for NEET mock tests?',
                a: 'Creating tests, AI import (with hourly limits), taking tests and running live exams with results are free. Weekly, monthly and yearly plans add exam-security rules such as full screen and tab-switch limits, scheduled exam windows, start forms, institute branding, held results and Excel export.',
            },
            {
                q: 'Can a student make their own NEET mock tests?',
                a: 'Yes. Sign in for free, photograph NCERT pages or an old paper in the AI test generator, set +4/−1 and a timer, keep the test private and take it on the NTA-style screen. Results show your score, subject marks, time on every question and an optional rank estimate for tests tagged NEET.',
            },
        ],

        closingTitle: 'Run your first NEET mock this week',
        closing: [
            html(`
<p>Start from whatever you have today:</p>
<div class="ng-paths">
<a class="ng-path" href="/generate-with-ai" data-icon="doc"><span class="ng-path-who">Have papers or DPPs?</span><span class="ng-path-what">Turn them into a NEET mock with AI</span></a>
<a class="ng-path" href="/create-test" data-icon="layers"><span class="ng-path-who">Setting up a batch test?</span><span class="ng-path-what">Build a four-section paper with +4/−1</span></a>
<a class="ng-path" href="/generate-with-ai" data-icon="book"><span class="ng-path-who">Preparing on your own?</span><span class="ng-path-what">Photograph NCERT pages, take a timed mock</span></a>
</div>
<p>Related reading: <a href="/cbt-exam-software">CBT exam software</a>, <a href="/jee-mock-test-platform">the JEE mock test platform guide</a>, <a href="/create-mock-test-online">how to create a mock test online</a>, <a href="/best-online-test-platform">how to choose an online test platform</a>, <a href="/online-test-for-coaching">TestoZa for coaching institutes</a> and <a href="/pricing">pricing</a>.</p>
`),
        ],

        sources: [
            {
                label: 'NEET-UG 2026',
                links: [
                    { label: 'NTA NEET (UG)', href: 'https://neet.nta.nic.in/' },
                    {
                        label: 'NTA press release on the result, 16 July 2026',
                        href: 'https://cdnbbsr.s3waas.gov.in/s37bc1ec1d9c3426357e69acd5bf320061/uploads/2026/07/20260716477215762.pdf',
                    },
                    { label: 'Re-exam timings (Careers360)', href: 'https://medicine.careers360.com/articles/re-neet-2026-exam-timings' },
                    { label: 'Re-exam paper analysis (ALLEN)', href: 'https://news.allen.in/neet-ug-2026-re-exam-paper-analysis-by-allen/' },
                ],
            },
            {
                label: 'The move to computer-based testing',
                links: [
                    { label: 'Minister’s statement, 15 May 2026 (The Quint)', href: 'https://www.thequint.com/news/breaking-news/neet-ug-2027-moves-to-computer-based-test' },
                    {
                        label: 'Centre to the Supreme Court, 5 August 2026 (Careers360)',
                        href: 'https://news.careers360.com/nta-neet-ug-exam-shift-cbt-computer-based-government-supreme-court-paper-leak-pen-and-paper-mode-expert-panel-nandan-nilekani',
                    },
                    {
                        label: 'Task force report awaited, 30 September 2026 (Telangana Today)',
                        href: 'https://telanganatoday.com/neet-paper-leak-centre-working-on-national-computer-based-testing-infra-strategy-for-entrance-exams',
                    },
                    {
                        label: 'NTA asks AICTE to identify CBT centres (Medical Dialogues)',
                        href: 'https://medicaldialogues.in/news/education/medical-admissions/neet-2027-to-shift-to-computer-based-test-nta-asks-aicte-to-identify-exam-centres-178572',
                    },
                ],
            },
            {
                label: 'Exam pattern',
                links: [
                    {
                        label: 'Section B removed from 2025 (Careers360)',
                        href: 'https://news.careers360.com/neet-ug-2025-nta-removes-optional-question-in-section-b-revised-exam-pattern-apaar-id-exam-date-latest-news',
                    },
                ],
            },
        ],
    },
};
