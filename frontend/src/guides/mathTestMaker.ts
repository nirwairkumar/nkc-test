/**
 * testoza.com/math-test-maker — how to make a maths test with real equations: why maths
 * is hard to put online, four ways to get equations in (AI import from a PDF or photo,
 * fill from a photo, the Sy Pad, LaTeX between dollar signs), question types and fair
 * numerical answers, marking, what students see on a phone, what the wrong options tell
 * a teacher, a comparison with Google Forms and Microsoft Forms, mistakes and honest
 * limits. Written for maths teachers in schools, coaching institutes and tutors, with
 * TestoZa as the worked example.
 *
 * Outside facts (sources in `sources`, checked 4 October 2026):
 *   - Google Forms has no equation editor. EquatIO (Texthelp) adds one, and inserts the
 *     maths into questions and answers as images.
 *   - Microsoft Forms: a Math switch on a quiz question opens an equation editor and math
 *     keypad, and Forms suggests right and wrong options; Microsoft 365 subscription.
 *   - Neither Google Forms nor Microsoft Forms has negative marking built in (Microsoft
 *     Q&A; Google Forms needs an add-on). Google Forms grades short answers by exact text.
 *   - KaTeX renders TeX to HTML plus MathML.
 *   - Exam patterns: JEE Main Mathematics 20 MCQs + 5 numerical, +4 / −1 (details on the
 *     JEE guide, linked); SSC CGL Tier 1 Quantitative Aptitude 25 questions, 2 marks,
 *     −0.5; IBPS PO prelims Quantitative Aptitude 35 questions in 20 minutes, −0.25.
 *
 * TestoZa claims checked against the code on 4 October 2026:
 *   - AI import (pages/AITestImporter.tsx): PDF or photos (.pdf, .png, .jpg, .jpeg, .webp);
 *     Word/PowerPoint refused with "Save As → PDF"; Extract or Generate; difficulty for
 *     Generate. Prompts write LaTeX ($…$); figures cropped and attached (backend
 *     figure_crops.py, latex_json.py). Review screen (components/ai-import/PreviewView.tsx):
 *     "Raw" shows the raw text and LaTeX, "Diagram" chip and figure, Page chip.
 *   - Fill from a photo (test-builder/PhotoFillSheet.tsx): one question, printed or
 *     handwritten; types question and options; ticks the answer only if it's marked.
 *   - Sy Pad (components/math-keyboard): tabs Algebra, Pre-Algebra, Trigonometry,
 *     Calculus, Statistics, Physics, Chemistry, Tables (+ 123 on phones), Words key, blue
 *     boxes, Insert refuses empty boxes unless "Insert anyway", Copy gives $…$, Tables:
 *     Headered, Grid, Match List, Simple List, Matrix, Determinant, Empty Grid.
 *   - Question boxes preview $…$ live (ui/IMEInput.tsx + LatexRenderer). LatexRenderer
 *     draws inline maths with \displaystyle (full-size fractions); KaTeX with mhchem.
 *   - Question types (builderUtils QUESTION_TYPE_LABELS): Single correct, Multiple
 *     correct, Numerical answer, Passage / case study. Numerical: "A range of values"
 *     (lowest/highest correct) or "Exact value(s)" (comma-separated). Fixed with this
 *     guide: exact values are now marked (scoring.py, TestPage, history, solutions read
 *     them; before, only the range was read, and min/max stay 0 in exact mode).
 *     Candidates type numbers only (/^-?\d*\.?\d*$/): digits, one point, a leading minus;
 *     an on-screen keypad (VirtualNumericPad), phone keyboard suppressed (inputMode none).
 *   - Marking (backend scoring.py): marks and negative marks per test, section or
 *     question (decimals allowed); multiple correct = marks × picked ÷ correct, any wrong
 *     option costs the negative mark. Calculator per test (has_scientific_calculator),
 *     opens in basic mode with a scientific switch.
 *   - Exam screen (pages/TestPage.tsx): text size 12–32 px (18 to start), maths scrolls
 *     sideways inside the question box (overflow-x-auto).
 *   - Teacher analysis (pages/FullTestAnalysisPage.tsx): accuracy, average time,
 *     distractor (option) distribution and discrimination index per question, rank list;
 *     detailed analytics are listed on paid plans (PricingPage). Solutions with LaTeX
 *     (SolutionEditorPage / SolutionsViewPage).
 *   - NOT in the product: long-answer or step marking, answers typed as expressions or
 *     fractions, a graphing or geometry-drawing tool, printing the test as a paper.
 */
import { MATH_TEST_MAKER_META } from './meta';
import { EXAM, IMPORTS, NOTATION, NUMERIC, OPTION_KEYS, OPTION_SPLIT, PAPER, QUADRATIC } from './mathData';
import { isNumericalCorrect } from '../utils/numericalAnswer';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

/* ── Crawler versions of the demos ────────────────────────────────────── */

const PASTE_FALLBACK = `
<p>One formula, the quadratic formula, shown four ways on a student’s phone:</p>
<ul>
<li><strong>Typed into a form field:</strong> <code>${QUADRATIC.typed}</code>. Readable to the teacher who typed it, ambiguous to a student (is “/ 2a” divided by 2a, or divided by 2 and then multiplied by a?).</li>
<li><strong>Copied out of a PDF:</strong> <code>${QUADRATIC.pdf.replace('\n', ' ')}</code>. The powers drop to the line, the fraction bar and the root sign disappear.</li>
<li><strong>Pasted as a screenshot:</strong> sharp at its own size, blurred when a student zooms in, a white box in dark mode, and impossible to edit or search.</li>
<li><strong>Typeset in TestoZa:</strong> x = (−b ± √(b² − 4ac)) / 2a drawn as real text, sharp at any zoom, following the student’s text size.</li>
</ul>
`;

const AI_FALLBACK = `
<p>Three files and what TestoZa’s AI import gives back, as you would see them on the review screen:</p>
${(Object.keys(IMPORTS) as (keyof typeof IMPORTS)[])
    .map((key) => {
        const src = IMPORTS[key];
        return `<h3>${src.label} (${src.mode === 'extract' ? 'extract its questions' : 'generate new questions'})</h3>
<ol>
${src.questions
    .map((q) => `<li>${q.plain}${q.image ? ' [diagram cropped from the page and attached]' : ''} ${OPTION_KEYS.map((k) => `(${k}) ${q.optionsPlain?.[k]}`).join(' ')}. Answer: (${q.answer}).</li>`)
    .join('\n')}
</ol>`;
    })
    .join('\n')}
<p>Every formula is stored as LaTeX between dollar signs; the review screen’s Raw button shows it, for example <code>${IMPORTS.worksheet.questions[0].text}</code>.</p>
`;

const SYPAD_FALLBACK = `
<p>A working copy of the Sy Pad, TestoZa’s maths keyboard, sits here on the page. Tap keys or type, watch the live preview, and press Insert to drop the formula into a sample question. Three replays build a quadratic formula, a definite integral and a determinant key by key. Fractions are ▫/▫, powers □ⁿ, subscripts □ₙ; the Calculus tab has integrals, limits and sums; the Tables tab has matrices, determinants and match-the-columns grids.</p>
`;

const NOTATION_FALLBACK = `
<div class="mt-table-wrap"><table class="mt-table">
<thead><tr><th scope="col">You want</th><th scope="col">Type this between $ signs</th><th scope="col">Students see</th></tr></thead>
<tbody>
${NOTATION.map((r) => `<tr><th scope="row">${r.want}</th><td data-label="Type"><code>${r.type}</code></td><td data-label="Students see">${r.plain}</td></tr>`).join('\n')}
</tbody>
</table></div>
`;

const verdict = (setting: (typeof NUMERIC.presets)[number]['setting'], value: string) => (isNumericalCorrect(setting, value) ? 'right' : 'wrong');

const NUMERIC_FALLBACK = `
<p>${NUMERIC.plain} Six candidates’ answers, marked under four settings:</p>
<div class="mt-table-wrap"><table class="mt-table">
<thead><tr><th scope="col">Answer typed</th>${NUMERIC.presets.map((p) => `<th scope="col">${p.label}</th>`).join('')}</tr></thead>
<tbody>
${NUMERIC.answers.map((a) => `<tr><th scope="row">${a.value} (${a.name})</th>${NUMERIC.presets.map((p) => `<td data-label="${p.label}">${verdict(p.setting, a.value)}</td>`).join('')}</tr>`).join('\n')}
</tbody>
</table></div>
<p>“Exact: 2.24” fails the candidate who wrote 2.236, which is more accurate. “Range 2.2 to 2.3” passes 2.25, which is wrong. The range 2.23 to 2.24 is the fair one.</p>
`;

const EXAM_FALLBACK = `
<p>A six-question maths test on TestoZa’s exam screen, drawn at a phone’s real size (${PAPER.title}; +${PAPER.right} for a right answer, −${PAPER.wrong} for a wrong one). Answer, change the text size, use the on-screen keypad for the numerical question, then check your marks.</p>
<ol>
${EXAM.map((q) => `<li>${q.plain}${q.optionsPlain ? ' ' + OPTION_KEYS.map((k) => `(${k}) ${q.optionsPlain?.[k]}`).join(' ') : ' (numerical answer)'}</li>`).join('\n')}
</ol>
`;

const OPTIONS_FALLBACK = `
<p>${OPTION_SPLIT.plain} How a class of ${OPTION_SPLIT.students} answered (made-up numbers), and what each choice tells the teacher:</p>
<ul>
${OPTION_SPLIT.options.map((o) => `<li><strong>(${o.key}) ${o.plain}: ${o.count} students.</strong> ${o.means}${o.reteach ? ` ${o.reteach}` : ''}</li>`).join('\n')}
</ul>
`;

/* ── The guide ─────────────────────────────────────────────────────────── */

export const MATH_TEST_MAKER: Guide = {
    meta: MATH_TEST_MAKER_META,
    body: {
        intro: [
            html(`
<p>Ask any maths teacher who has moved a test online what took the longest, and it is never the questions. It is the equations. A fraction wants to stack, a power wants to float, a root wants to stretch over everything under it, and a form field gives you one flat line. So teachers type <code>x^2</code> and hope, paste screenshots that blur on a phone, or give up and print the paper again.</p>
<p>This guide is about getting maths into an online test without that fight. It covers the four ways to get equations in (from the paper you already have, from a photo, by tapping keys, or with a little LaTeX), how to set numerical answers so rounding doesn’t cost a student marks, how to mark a maths paper the way your exam does, and what students actually see on their phones. Every demo on this page is working: you can type an integral, run an import and sit a short test without leaving it.</p>
<p>It is written for maths teachers in schools (Classes 6 to 12), coaching institutes preparing students for JEE, Olympiads and the quantitative sections of SSC and bank exams, and private tutors. We use TestoZa as the worked example, and say plainly where it falls short.</p>
`),
        ],
        answer:
            'A good math test maker lets you add equations without learning LaTeX, shows them as sharp text rather than pictures on any phone, and marks numerical answers fairly. In TestoZa you can upload a question paper as a PDF or photo and AI types the maths and crops the diagrams; type new questions with the Sy Pad, a maths keyboard with a live preview; or write LaTeX between dollar signs. Students take the test on any phone, and a numerical answer can accept a range such as 2.23 to 2.24.',
        sections: [
            {
                id: 'why-maths-is-hard',
                title: 'Why maths is the hardest subject to put online',
                tocLabel: 'Why maths is hard',
                kicker: 'The problem',
                blocks: [
                    html(`
<p>A history question is a sentence. A maths question is a small drawing. In <em>x</em> = (−<em>b</em> ± √(<em>b</em>² − 4<em>ac</em>)) / 2<em>a</em>, the fraction bar says what is divided by what, the root sign says how far the root reaches, and the little 2 says it is a square. Flatten it onto one line and the meaning moves into brackets that students have to decode, often under a timer.</p>
<p>Most online forms were built for sentences. <strong>Google Forms has no equation editor at all.</strong> The popular fix, the EquatIO extension, lets you build an equation and then inserts it into the question or option <em>as an image</em>. <strong>Microsoft Forms</strong> does better: turn on its Math switch for a quiz question and you get an equation editor with a maths keypad, and Forms suggests right and wrong options for you. It needs a Microsoft 365 subscription, and neither tool lets a wrong answer cost marks.</p>
<p>So teachers fall back on four workarounds, and each one hurts somewhere:</p>
<ul>
<li><strong>Typing it flat</strong> with <code>^</code> and <code>/</code>. Quick, but <code>1/2x</code> can mean ½·<em>x</em> or 1/(2<em>x</em>), and the student who reads it the other way loses marks for your typing.</li>
<li><strong>Copying from a PDF.</strong> The text comes out, the structure doesn’t: powers drop to the line, fraction bars vanish, root signs go missing.</li>
<li><strong>Screenshots.</strong> They look right on your laptop. On a phone they blur when students zoom in, sit as white boxes in dark mode, can’t be corrected without making a new picture, can’t be searched, and say nothing to a screen reader.</li>
<li><strong>LaTeX.</strong> The real answer, and the one mathematicians use, but few school teachers have time to learn it.</li>
</ul>
<p>Switch between the four below, then zoom in the way a student squinting at a phone would.</p>
`),
                    { type: 'widget', widget: 'math-paste', fallbackHtml: PASTE_FALLBACK },
                    html(`
<p>The typeset version isn’t a picture: it is text drawn with KaTeX, the same engine TestoZa’s exam screen uses, with a MathML copy underneath for screen readers. For this formula that is 41 bytes of text against 2,620 bytes for a tight screenshot of it, about 64 times more, and a phone photo of a page is far bigger again. On a slow connection, a paper with forty screenshots loads in pieces; a paper written as text arrives at once.</p>
`),
                ],
            },
            {
                id: 'four-ways',
                title: 'Four ways to get equations into a test, and when to use each',
                tocLabel: 'Four ways in',
                kicker: 'The short version',
                blocks: [
                    html(`
<p>You rarely start from nothing. Usually there is a printed paper from last year, a worksheet, a page of a reference book, or a question scribbled in a notebook. Pick the way in that matches what you already have:</p>
<div class="mt-table-wrap"><table class="mt-table">
<thead><tr><th scope="col">You have</th><th scope="col">Do this</th><th scope="col">Best for</th><th scope="col">Watch for</th></tr></thead>
<tbody>
<tr><th scope="row">A question paper or worksheet as a PDF, or photos of one</th><td data-label="Do this">Upload it; AI types every question, the maths and the options, and crops the diagrams</td><td data-label="Best for">A whole paper at once, 20 to 100 questions</td><td data-label="Watch for">Read it once before it goes live: a smudged exponent changes an answer</td></tr>
<tr><th scope="row">One question in a book or a notebook</th><td data-label="Do this">Fill from a photo: snap it, and the question and options are typed into the box you were on</td><td data-label="Best for">Adding a question or two to a test you are building</td><td data-label="Watch for">The answer is ticked only if it is marked in the photo; nothing is solved for you</td></tr>
<tr><th scope="row">A new question in your head</th><td data-label="Do this">Open the Sy Pad and tap the formula in, like a calculator, with a live preview</td><td data-label="Best for">Teachers who have never used LaTeX</td><td data-label="Watch for">Blue boxes are blanks; Insert warns you if one is still empty</td></tr>
<tr><th scope="row">A little LaTeX</th><td data-label="Do this">Type it between dollar signs straight into the question or an option</td><td data-label="Best for">Speed, once you know a dozen commands</td><td data-label="Watch for">Use braces for anything longer than one character: <code>x^{10}</code>, not <code>x^10</code></td></tr>
</tbody>
</table></div>
<p>They mix freely. A typical week looks like this: import last year’s unit test, fix two questions with the Sy Pad, add a fresh problem from a photo of the reference book, and type a quick <code>$\\sqrt{2}$</code> in an option without opening anything. All four end up in the same place: text with LaTeX between dollar signs, which is what the exam screen draws.</p>
`),
                ],
            },
            {
                id: 'from-a-paper',
                title: 'From a PDF or a photo: let AI type the maths',
                tocLabel: 'From a PDF or photo',
                kicker: 'Already have the paper',
                blocks: [
                    html(`
<p>If a paper already exists, don’t retype it. On TestoZa, <a href="/generate-with-ai">upload a question paper</a> as a PDF or as photos (a Word or PowerPoint file needs one extra step: open it and choose File → Save As → PDF). You pick one of two jobs:</p>
<ul>
<li><strong>Extract</strong> keeps your questions exactly as printed: the wording, the options, the order, and the answers where the paper prints them or has a key.</li>
<li><strong>Generate</strong> reads a chapter or your notes and writes new questions from them, at the difficulty you choose (Easy, Moderate or Tough).</li>
</ul>
<p>Either way, the AI writes every formula in LaTeX, the format the exam screen draws, so fractions, powers, roots, integrals, matrices and Greek letters come out typeset instead of flattened. A figure on the page, such as a triangle or a graph, is cropped from the page and attached to its question. Before anything is saved you get a review screen: each question with its options and the correct answer ticked, a chip saying which page it came from, and a <strong>Raw</strong> button that shows the LaTeX behind the formatting, in case you want to check a sign.</p>
<p>Try it with three kinds of file. The review screen below is the product’s own; the questions were written for this page.</p>
`),
                    { type: 'widget', widget: 'math-ai-import', fallbackHtml: AI_FALLBACK },
                    html(`
<p>One rule we’d ask every teacher to keep: <strong>read the paper once before students see it.</strong> AI reads printed maths well and handwriting reasonably, but not perfectly. The mistakes that matter in maths are small ones: a minus sign read as a dash, an index of 2 read as 3, <em>x</em> and × confused in a scan. The review screen draws every formula, so the check takes a few minutes for a whole paper, and you can fix anything in the editor afterwards.</p>
<p>For a single question, <strong>Fill from a photo</strong> is quicker than an import. Open it from the question you are on, take or choose a photo of one question, printed or handwritten, and the question and its options are typed into that box. It ticks an answer only when the photo shows one marked; it never solves the question for you, which is the right way round for a test.</p>
`),
                ],
            },
            {
                id: 'sy-pad',
                title: 'The Sy Pad: tap the maths in, like a calculator',
                tocLabel: 'The Sy Pad keyboard',
                kicker: 'Typing new questions',
                blocks: [
                    html(`
<p>For questions you write yourself, TestoZa has the <strong>Sy Pad</strong>, a maths keyboard built for teachers who have never typed LaTeX. You open it from <em>Maths &amp; symbols</em> under any question, from the builder’s ⋯ menu, or from the sidebar while building a test. A chip at the top tells you where the formula will go (“Goes into Question 3 · Option B”), so you never paste into the wrong box.</p>
<p>It works the way a calculator does. Tap ▫/▫ and you get a fraction with two blue boxes; the first is selected, so you type the top, move to the bottom, and type that. Tap □ⁿ after a number for a power, □ₙ for a subscript. The preview above the keys always shows the formula as students will see it, and clicking a symbol in the preview moves your cursor there. Tabs hold the rest: Algebra, Pre-Algebra, Trigonometry, Calculus (integrals, limits, sums), Statistics, Physics, Chemistry and Tables, with a <em>Words</em> key for “speed = 5 m/s” style text inside a formula.</p>
<p>Two details save real time. Insert refuses a formula with an empty blue box (unless you choose “Insert anyway”), so half-finished maths doesn’t reach students. And the Tables tab makes the layouts that are painful anywhere else: a matrix, a determinant, a match-the-columns grid. This is a working copy; press a replay to watch a formula being built, then try your own.</p>
`),
                    { type: 'widget', widget: 'math-sypad', fallbackHtml: SYPAD_FALLBACK },
                    html(`
<p>The code line under the preview is the LaTeX the pad writes for you. You never have to look at it, but it is how many teachers learn LaTeX without meaning to: after a week of tapping ▫/▫, <code>\\frac{}{}</code> starts to look familiar. <em>Copy</em> puts the formula on your clipboard with its dollar signs, ready to paste into another question.</p>
`),
                ],
            },
            {
                id: 'latex',
                title: 'If you know a little LaTeX: type it between dollar signs',
                tocLabel: 'LaTeX cheat sheet',
                kicker: 'The fastest way',
                blocks: [
                    html(`
<p>Every question box and option in TestoZa accepts LaTeX between dollar signs, and shows a live preview as soon as it sees one. You don’t need the whole language: a dozen commands cover almost every school and entrance paper. The table below is the set we see teachers use most; copy any line, paste it between <code>$</code> signs, and it renders.</p>
`),
                    { type: 'widget', widget: 'math-notation', fallbackHtml: NOTATION_FALLBACK },
                    html(`
<p>Four habits keep LaTeX trouble-free:</p>
<ul class="mt-checks">
<li><strong>Braces around anything longer than one character.</strong> <code>x^{10}</code> is <em>x</em>¹⁰; <code>x^10</code> is <em>x</em>¹0.</li>
<li><strong><code>\\left(</code> and <code>\\right)</code> for tall brackets</strong> around fractions, so the brackets grow with what they hold.</li>
<li><strong><code>\\text{}</code> for words inside maths,</strong> or “cm” turns into the italic variables <em>c</em> times <em>m</em>.</li>
<li><strong>One formula per pair of dollar signs.</strong> Write the words of the question as normal text and wrap only the maths.</li>
</ul>
<p>Fractions inside a sentence are drawn full size on TestoZa’s exam screen, not shrunk to fit the line, so a fraction in an option stays readable on a small phone. Chemistry works the same way with <code>\\ce{}</code>, if your institute also sets science papers.</p>
`),
                ],
            },
            {
                id: 'question-types',
                title: 'Question types for maths, and numerical answers that are fair',
                tocLabel: 'Question types',
                kicker: 'Question types',
                blocks: [
                    html(`
<p>TestoZa has four question types, and each has a natural use in maths:</p>
<ul>
<li><strong>Single correct</strong>: the standard four-option question. Best for testing one idea quickly, and for spotting misconceptions (more on that below).</li>
<li><strong>Multiple correct</strong>: tick every true statement, as in JEE Advanced-style questions on properties of functions or matrices. Partial credit is proportional: pick two of three correct options and you get two-thirds of the marks, but any wrong option costs the negative mark.</li>
<li><strong>Numerical answer</strong>: no options; the student types a number. This is where maths tests become honest, because there is nothing to guess between.</li>
<li><strong>Passage / case study</strong>: one passage with several questions under it, the shape of the case-based questions in CBSE papers.</li>
</ul>
<p>Numerical questions need one decision from you: <strong>a range or exact values.</strong> A range (“lowest correct 2.23, highest correct 2.24”) accepts any number in between. Exact values (“100, 150, 200”) accept only the numbers listed, each counted as correct. Students type with an on-screen number pad, so the phone’s keyboard never covers the question, and they can enter digits, one decimal point and a minus sign, nothing else.</p>
<p>That last point matters for how you write the question. A student cannot type 3/4 or √5 into a numerical box, so ask for a decimal and say how to round. Then decide what you’ll accept. Try the settings below on six real-looking answers to one question.</p>
`),
                    { type: 'widget', widget: 'math-numerical', fallbackHtml: NUMERIC_FALLBACK },
                    html(`
<p>The pattern holds for any rounded answer: <strong>set the range from the truncated value to the rounded value</strong>, here 2.23 to 2.24, and write the rounding rule in the question. Use exact values for answers that really are exact, such as 32, 210 or −2, and list every form you’d accept. If your exam awards marks only for one exact form, as some entrance tests do, mirror that and tell students in your instructions, so the practice test trains the habit.</p>
`),
                ],
            },
            {
                id: 'marking',
                title: 'Marks, negative marking and sections for maths papers',
                tocLabel: 'Marking',
                kicker: 'Marking',
                blocks: [
                    html(`
<p>Marks in TestoZa can be set for the whole test, for a section, or for a single question, and the most specific one wins. Negative marks accept decimals, so −0.25, −0.5 and −1 all work. Turn on sections and the exam screen shows section tabs, while results split scores by section. A calculator can be switched on for the test; it opens in basic mode and has a scientific mode, so only switch it on when the real exam allows one.</p>
<p>Copy your exam’s pattern rather than inventing one. Practice that marks differently from the real thing teaches the wrong instincts about when to guess:</p>
<div class="mt-table-wrap"><table class="mt-table">
<thead><tr><th scope="col">Test</th><th scope="col">Question types</th><th scope="col">Marking to set</th><th scope="col">Pace to expect</th></tr></thead>
<tbody>
<tr><th scope="row">School unit test, Classes 6–10</th><td data-label="Question types">Single correct, a few numerical</td><td data-label="Marking to set">+1 or +2, no negative marking</td><td data-label="Pace">1–2 minutes a question</td></tr>
<tr><th scope="row">Board practice, Classes 10–12</th><td data-label="Question types">Single correct, assertion–reason as single correct, case studies as passages</td><td data-label="Marking to set">Your board’s marks per question, no negative marking</td><td data-label="Pace">Set by the section you are practising</td></tr>
<tr><th scope="row">JEE Main Mathematics</th><td data-label="Question types">20 single correct + 5 numerical</td><td data-label="Marking to set">+4 / −1 (see our <a href="/jee-mock-test-platform">JEE mock test guide</a>)</td><td data-label="Pace">About 2 minutes a question</td></tr>
<tr><th scope="row">SSC CGL Quantitative Aptitude</th><td data-label="Question types">25 single correct</td><td data-label="Marking to set">+2 / −0.5</td><td data-label="Pace">Under a minute a question</td></tr>
<tr><th scope="row">Bank PO prelims Quantitative Aptitude</th><td data-label="Question types">35 single correct</td><td data-label="Marking to set">+1 / −0.25</td><td data-label="Pace">35 questions in 20 minutes</td></tr>
</tbody>
</table></div>
<p>For aptitude batches, the timer matters as much as the maths: a quant section is a speed test, so give the real section’s time and no more. For board practice, the opposite: give generous time and judge accuracy, because the board paper rewards complete, careful working that an online test can’t see.</p>
`),
                ],
            },
            {
                id: 'student-view',
                title: 'What students see: equations as text, on any phone',
                tocLabel: 'On a student’s phone',
                kicker: 'On the student’s phone',
                blocks: [
                    html(`
<p>Most students in India will take your test on a phone, often a budget Android with a small screen. Three things decide whether a maths test works there, and you can feel all three in the demo below.</p>
<ul>
<li><strong>The maths is text.</strong> It stays sharp at any size, and when a student makes the text bigger (the faint − and + at the top right of the question, from 12 to 32 pixels), fractions and roots grow with it.</li>
<li><strong>Wide maths scrolls, not breaks.</strong> A long expression or a matrix that is wider than the screen scrolls sideways inside its question, instead of pushing the page off the edge.</li>
<li><strong>Numbers go in through a keypad.</strong> A numerical question shows an on-screen number pad, the way computer-based exams do, so the phone’s keyboard doesn’t jump up and hide the question.</li>
</ul>
`),
                    { type: 'widget', widget: 'math-exam', fallbackHtml: EXAM_FALLBACK },
                    html(`
<p>The same screen runs on a laptop or a computer lab, with the question palette beside the question instead of behind a button. If you want students used to the national computer-based test layout before JEE Main, CUET or SSC, this is the layout they will practise on. For running a test at a fixed time with a join code, see our guide to <a href="/how-to-conduct-online-exam">conducting an online exam</a>.</p>
`),
                ],
            },
            {
                id: 'after-the-test',
                title: 'After the test: what the wrong options tell you',
                tocLabel: 'Reading the results',
                kicker: 'After the test',
                blocks: [
                    html(`
<p>Marking is instant, but the score is the least useful number a maths test produces. The useful one is <em>which wrong answer</em> students chose. In a well-written maths question, every wrong option is a known mistake: forgetting a negative root, dropping a factor of 2, confusing area with perimeter. When 18 students in 40 pick the same wrong option, you don’t have 18 careless students; you have one lesson to reteach.</p>
<p>TestoZa’s teacher analysis shows this for every question: the share of students who chose each option, how many got it right, the average time spent on it, and a <em>discrimination index</em>, which says whether the students who did well overall got this question right more often than those who didn’t. A common rule of thumb: 0.3 and above, the question separates strong and weak students well; near zero, it doesn’t, and a negative value usually means the question or its answer key is wrong. Tap the options below to see how one question reads.</p>
`),
                    { type: 'widget', widget: 'math-options', fallbackHtml: OPTIONS_FALLBACK },
                    html(`
<p>Students get their side straight away: which questions they got right, wrong, partly right or skipped, and how long each took. Add a written solution to a question, with equations typed the same four ways, and students can read it when they review the test. The rank list and full per-question analysis are part of the paid plans, alongside institute branding and exam rules.</p>
`),
                ],
            },
            {
                id: 'compared',
                title: 'TestoZa, Google Forms and Microsoft Forms for maths tests',
                tocLabel: 'Compared with Forms',
                kicker: 'Compared',
                blocks: [
                    html(`
<p>Google Forms and Microsoft Forms are fine for a quick check of understanding. For maths with real notation and real marking, the differences show up fast:</p>
<div class="mt-table-wrap"><table class="mt-table">
<thead><tr><th scope="col"></th><th scope="col">Google Forms</th><th scope="col">Microsoft Forms</th><th scope="col">TestoZa</th></tr></thead>
<tbody>
<tr><th scope="row">Equations in a question</th><td data-label="Google Forms">No editor; add-ons insert images</td><td data-label="Microsoft Forms">Math switch with an equation editor (Microsoft 365)</td><td data-label="TestoZa">Sy Pad, LaTeX between $ signs, or AI import</td></tr>
<tr><th scope="row">How the maths reaches students</th><td data-label="Google Forms">As pictures</td><td data-label="Microsoft Forms">Formatted by Forms</td><td data-label="TestoZa">As text (KaTeX), sharp at any size</td></tr>
<tr><th scope="row">Turn an existing paper into a test</th><td data-label="Google Forms">Retype it</td><td data-label="Microsoft Forms">Retype it</td><td data-label="TestoZa">Upload the PDF or photos; diagrams cropped</td></tr>
<tr><th scope="row">Accept a range of numerical answers</th><td data-label="Google Forms">No: short answers are graded by exact text</td><td data-label="Microsoft Forms">No: a range can’t be a quiz answer</td><td data-label="TestoZa">Yes, or a list of exact values, typed on a keypad</td></tr>
<tr><th scope="row">Negative marking</th><td data-label="Google Forms">Not built in</td><td data-label="Microsoft Forms">Not built in</td><td data-label="TestoZa">Per test, section or question</td></tr>
<tr><th scope="row">Exam-style screen with a timer and palette</th><td data-label="Google Forms">No</td><td data-label="Microsoft Forms">No</td><td data-label="TestoZa">Yes</td></tr>
</tbody>
</table></div>
<p>Where Microsoft Forms is genuinely ahead: it can suggest wrong options for a maths question automatically. Where TestoZa is ahead: the paper you already have becomes a test without retyping, the maths survives the trip to a cheap phone, and the marking matches competitive exams. If you live in Microsoft 365 and set short class quizzes, Forms may be all you need.</p>
`),
                ],
            },
            {
                id: 'mistakes',
                title: 'Nine mistakes that make an online maths test unfair',
                tocLabel: 'Nine mistakes',
                kicker: 'Mistakes',
                blocks: [
                    html(`
<ol class="mt-steps">
<li><strong>Equations as screenshots.</strong> Blurry on phones, invisible to screen readers, uneditable when you spot a typo the night before.</li>
<li><strong>Ambiguous flat typing.</strong> <code>1/2x</code>, <code>-3^2</code>, <code>sin x^2</code>: each has two readings. Typeset it, or add brackets.</li>
<li><strong>A numerical answer with no rounding rule.</strong> “Find √5” without “to two decimal places” punishes the student who gave more decimals, or fewer.</li>
<li><strong>A range that is too tight, or too loose.</strong> Exact 2.24 fails 2.236; 2.2 to 2.3 passes 2.25. Set the range from truncated to rounded.</li>
<li><strong>Asking for a fraction in a numerical box.</strong> Students can type 0.75, not 3/4. Ask for a decimal, or make it a single-correct question.</li>
<li><strong>Negative marking students weren’t told about.</strong> Put the marking in the test’s instructions, and match the real exam.</li>
<li><strong>Options that give the answer away.</strong> If three options are integers and one is a surd, students choose the surd. Make every option a plausible mistake.</li>
<li><strong>A diagram too small to read on a phone.</strong> Crop it to the figure, and check that labels are legible at phone width.</li>
<li><strong>Not taking your own test on a phone first.</strong> Five minutes as a student catches the wide matrix, the long option and the typo.</li>
</ol>
`),
                ],
            },
            {
                id: 'limits',
                title: 'Where TestoZa isn’t the right maths tool (yet)',
                tocLabel: 'Honest limits',
                kicker: 'Honest limits',
                blocks: [
                    html(`
<ul class="mt-limits">
<li><strong>No long answers or step marking.</strong> Every question is marked automatically, so working, proofs and constructions still belong on paper. Use online tests for what they do well: quick, frequent, objective practice.</li>
<li><strong>Answers are numbers, not expressions.</strong> A student can type −2.5, but not 2<em>x</em> + 3 or 3/4. Test expressions with single- or multiple-correct questions.</li>
<li><strong>No graphing or geometry drawing.</strong> Figures are pictures: cropped from your paper by the import, or uploaded. You can’t draw a graph inside the builder.</li>
<li><strong>AI needs a human check.</strong> Clean print reads very well; faint photocopies and messy handwriting less so. Budget a few minutes to read each imported paper.</li>
<li><strong>No printed paper from the test.</strong> TestoZa runs tests on screens. If you also need a paper copy, our free <a href="https://pdf.testoza.com/latex-to-pdf">LaTeX to PDF</a> tool turns LaTeX into a printable PDF.</li>
</ul>
`),
                ],
            },
        ],
        faqs: [
            {
                q: 'Can I add equations to Google Forms?',
                a: 'Not with Google Forms alone: it has no equation editor. Add-ons such as EquatIO let you build an equation and insert it, but it goes in as an image, which blurs when students zoom in on a phone and can’t be edited as text. A math test maker like TestoZa stores equations as text, so they stay sharp and editable.',
            },
            {
                q: 'Do I need to know LaTeX to make a maths test?',
                a: 'No. You can upload an existing paper and let AI type the maths, fill a question from a photo, or tap formulas in with the Sy Pad, a maths keyboard with a live preview. LaTeX is optional: if you know a few commands, typing them between dollar signs is the fastest way.',
            },
            {
                q: 'Can students answer with a fraction or an expression?',
                a: 'Not in a numerical question: students type a number with an on-screen keypad (digits, one decimal point and a minus sign). Ask for a decimal and state the rounding, or test fractions and expressions as single-correct or multiple-correct questions.',
            },
            {
                q: 'How do I accept rounded answers in a numerical question?',
                a: 'Choose “A range of values” and set the lowest and highest correct answers. For √5 to two decimal places, 2.23 to 2.24 accepts both the truncated and the rounded value. For answers that are exact, such as 32, choose “Exact value(s)” and list every number you’d accept, separated by commas.',
            },
            {
                q: 'Can AI read handwritten maths?',
                a: 'Yes, within reason. Fill from a photo reads a printed or handwritten question and types the question and options; the AI import reads PDFs and photos of whole papers. Clear handwriting works well, faint or crowded writing less so. Always read the result once before students see it.',
            },
            {
                q: 'Will equations show properly on a cheap Android phone?',
                a: 'Yes. TestoZa draws maths as text with KaTeX, so it is sharp on any screen, grows when the student increases the text size, and loads quickly on a slow connection. Wide expressions such as matrices scroll sideways inside the question instead of breaking the page.',
            },
            {
                q: 'Can I add diagrams and graphs to maths questions?',
                a: 'Yes, as images. The AI import crops figures from your paper and attaches them to the right questions, and you can upload an image to any question or option. There is no tool for drawing graphs or geometric constructions inside the builder.',
            },
            {
                q: 'Can I make a JEE-style maths test with negative marking?',
                a: 'Yes. Set +4 and −1, add a Mathematics section with single-correct and numerical questions, and students get an NTA-style exam screen. Our JEE mock test guide covers the full JEE Main and Advanced setup, including multiple-correct partial marking.',
            },
            {
                q: 'Can I write solutions with equations?',
                a: 'Yes. Solutions accept the same maths as questions: LaTeX between dollar signs, or formulas from the Sy Pad. Students can read them when they review the test.',
            },
            {
                q: 'Is the math test maker free?',
                a: 'TestoZa has a free plan for individual teachers, which covers making maths tests and sharing them with students. Paid plans, from ₹49 a week, add institute branding, exam-security rules, detailed analytics and more result submissions.',
            },
            {
                q: 'Can I make a maths test in Hindi?',
                a: 'Yes. Question boxes have a हिंदी switch for typing Hindi with English letters, and LaTeX works the same inside Hindi text. Our Hindi online test maker guide shows the details.',
            },
            {
                q: 'Can I print the test as a question paper?',
                a: 'Not from the test itself: TestoZa runs tests on screens. For paper copies, the free LaTeX to PDF tool at pdf.testoza.com turns LaTeX into a clean, printable PDF.',
            },
        ],
        closingTitle: 'Make one real maths test this week',
        closing: [
            html(`
<p>Don’t start with a whole question bank. Take next week’s unit test, the paper you would have printed anyway, and put it online: import it, read it once, fix what needs fixing with the Sy Pad, and send the link. One test will tell you more than this guide can.</p>
<div class="mt-paths">
<a class="mt-path" href="/generate-with-ai" data-icon="doc"><span class="mt-path-who">Have a paper already?</span><span class="mt-path-what">Upload the PDF or photos</span></a>
<a class="mt-path" href="/create-test" data-icon="pencil"><span class="mt-path-who">Writing new questions?</span><span class="mt-path-what">Open the builder and the Sy Pad</span></a>
<a class="mt-path" href="/how-to-conduct-online-exam" data-icon="key"><span class="mt-path-who">Running it at a fixed time?</span><span class="mt-path-what">Set up a sitting with a join code</span></a>
</div>
<p>Related reading: <a href="/jee-mock-test-platform">a JEE mock test platform</a>, <a href="/ai-test-generator">the AI test generator</a>, <a href="/cbt-exam-software">CBT exam software</a>, <a href="/hindi-online-test-maker">a Hindi online test maker</a> and <a href="/prevent-cheating-in-online-exams">how to prevent cheating in online exams</a>.</p>
`),
        ],
        sources: [
            {
                label: 'Google Forms and Microsoft Forms',
                links: [
                    { label: 'Math in Google Forms with EquatIO (Texthelp)', href: 'https://website-us.texthelp.com/products/equatio/math-in-google-forms/' },
                    { label: 'Create a math quiz in Microsoft Forms (Microsoft Support)', href: 'https://support.microsoft.com/en-us/topic/create-a-math-quiz-in-microsoft-forms-24965e20-47f5-4a96-b853-c49dab873fb6' },
                    { label: 'Negative score for wrong answers in Microsoft Forms (Microsoft Q&A)', href: 'https://learn.microsoft.com/en-us/answers/questions/112377/negative-score-for-wrong-answer-in-test-exam-using' },
                    { label: 'A range of numbers as a quiz answer in Microsoft Forms (Microsoft Q&A)', href: 'https://learn.microsoft.com/en-us/answers/questions/5061145/microsoft-forms-quiz-with-correct-answers-the-answ' },
                    { label: 'Set up quiz grading options (Google Forms API)', href: 'https://developers.google.com/workspace/forms/api/guides/setup-grading' },
                ],
            },
            {
                label: 'Maths on the web',
                links: [
                    { label: 'KaTeX', href: 'https://katex.org/' },
                    { label: 'KaTeX options: output (HTML and MathML)', href: 'https://katex.org/docs/options' },
                ],
            },
        ],
    },
};
