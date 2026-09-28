/**
 * testoza.com/jee-mock-test-platform — how JEE faculty build JEE Main and Advanced
 * mocks without learning LaTeX (AI import + the Sy Pad keyboard), how institutes
 * run them, and what students get. Written for JEE faculty, coaching institutes
 * and aspirants.
 *
 * Every product claim was checked against the code on 2026-09-28:
 *   - Sy Pad: src/components/math-keyboard (MathKeyboard.tsx, keys.ts, mathSyntax.ts,
 *     TableEditor.tsx). Opened from "Maths & symbols" under each question
 *     (test-builder/QuestionCard.tsx), "Open Sy Pad" in the builder's ⋯ menu
 *     (TestBuilder.tsx) and "Sy Pad" under Create Test in the sidebar on the builder
 *     page (AppSidebar.tsx). Docks at the bottom, drag the top bar to move,
 *     double-click to dock, Done / Esc to close. "Goes into Question 3 · Option B"
 *     target chip; tabs Algebra, Pre-Algebra, Trigonometry, Calculus, Statistics,
 *     Physics, Chemistry, Tables (+ "123" on phones) and a Words key; placeholder
 *     "blue boxes"; Insert refuses empty boxes / unrenderable formulas unless you
 *     choose "Insert anyway"; smart backspace; paired braces; keeps the last good
 *     preview with "keep typing…"; "How to" help table; editable code line, Enter
 *     inserts, Copy copies $…$. Chemistry: Formula (\ce{}), ⇌, arrow with boxes
 *     above/below, gas/precipitate, (aq)(s)(l)(g), Ka, Kb, pH, mol.
 *     Tables: Headered, Grid, Match List (P/Q/R/S · 1/2/3/4), Simple List, Matrix,
 *     Determinant, Empty Grid.
 *   - Question boxes show a live preview when they contain $…$ (ui/IMEInput.tsx).
 *   - AI import: src/pages/AITestImporter.tsx — PDF, Word, PowerPoint, photos;
 *     Extract vs Generate; Same as material / English / Hindi / both; Easy /
 *     Moderate / Tough for Generate; custom instructions. Prompts write LaTeX and
 *     mhchem (backend ai_preview_importer/pdf_vision_pipeline.py).
 *   - Fill from photo: POST /ai/read-question (backend/app/routers/ai.py) — printed
 *     or handwritten; answer only from a mark or an "Ans:" line, never solved;
 *     diagram cropped (lib/photoQuestionApi.ts).
 *   - Numerical answers: a range or exact value(s) (QuestionCard.tsx). Hindi typing
 *     with English letters (LanguageToggle).
 *   - Scoring: backend/app/services/scoring.py — marks test > section > question;
 *     fractions; multi-correct partial credit is marks × picked ÷ correct, any wrong
 *     option costs the negative mark; attempt control hard / soft (best N, first N).
 *   - Teacher analysis: src/pages/FullTestAnalysisPage.tsx — rank list, per-question
 *     accuracy, average time, option (distractor) distribution, discrimination index.
 *     Topic breakdowns only exist when questions carry a topic, so we don't lean on them.
 *   - Student results: src/pages/ResultsPage.tsx — correct / wrong / partial /
 *     skipped, time per question, AI mentor (AIChatBot), rank predictor for tests
 *     tagged JEE Main / JEE Advanced, retake.
 *   - NOT in the product: per-section timers, JEE Advanced's exact +1/+2/+3 partial
 *     rule, server-side time enforcement. Don't claim them.
 * Exam facts: see `sources`. Sources disagree on negative marking for JEE Main
 * numericals, so the text sends readers to the year's bulletin.
 */
import { JEE_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const NOTATION_FALLBACK = `
<ul>
<li><strong>A definite integral.</strong> In the Sy Pad: Calculus tab, the ∫ with limits key, then fill the blue boxes (0, π over 2, sin, the power key, 2, x dx). Code written for you: <code>\\int\\limits_{0}^{\\frac{\\pi }{2}}{\\sin ^{2}x\\,dx}</code>. Students see the integral from 0 to π/2 of sin²x dx.</li>
<li><strong>A limit.</strong> Calculus tab, the lim key, then the fraction key. Code: <code>\\lim_{x \\to 0}\\frac{\\sin x}{x}</code>.</li>
<li><strong>A 3 × 3 determinant.</strong> Tables tab, Det, set 3 × 3 and fill the cells. Code: <code>\\begin{vmatrix} 1 &amp; x &amp; x^{2} \\\\ 1 &amp; y &amp; y^{2} \\\\ 1 &amp; z &amp; z^{2} \\end{vmatrix}</code>.</li>
<li><strong>Coulomb’s law.</strong> The fraction key, π, ε₀ from the Physics tab and the subscript key. Code: <code>F=\\frac{1}{4\\pi \\varepsilon_0 }\\frac{q_{1}q_{2}}{r^{2}}</code>.</li>
<li><strong>A redox half-reaction.</strong> Chemistry tab, Formula, then type MnO4^- + 8H+ + 5e- -&gt; Mn^2+ + 4H2O. Code: <code>\\ce{MnO4^- + 8H+ + 5e- -&gt; Mn^2+ + 4H2O}</code>.</li>
<li><strong>An equilibrium.</strong> Formula, then type N2 + 3H2 &lt;=&gt; 2NH3. Code: <code>\\ce{N2 + 3H2 &lt;=&gt; 2NH3}</code>.</li>
<li><strong>A complex ion.</strong> Formula, then type [Fe(CN)6]^4-. Code: <code>\\ce{[Fe(CN)6]^4-}</code>.</li>
<li><strong>Heat over the arrow.</strong> Formula for CaCO3, the arrow with boxes and Δ, then Formula for CaO + CO2. Code: <code>\\ce{CaCO3}\\xrightarrow{\\Delta }\\ce{CaO + CO2}</code>.</li>
</ul>`;

const SYPAD_FALLBACK = `
<p>The Sy Pad is an on-screen keyboard in TestoZa’s test builder. Its top bar shows where the formula will go (for example “Goes into Question 3 · Option B”). Below that is a live preview of the formula with an Insert button, and a line showing the code being written, with a Copy button. Tabs switch the symbol keys between Algebra, Pre-Algebra, Trigonometry, Calculus, Statistics, Physics, Chemistry and Tables, and a Words key adds plain words inside a formula. A number pad with x, y, z, brackets, fraction, roots, powers and subscripts is always on screen, with Delete, cursor and Clear keys beside it.</p>`;

const AI_FALLBACK = `
<p>A question as printed in a PDF: “The number of moles of KMnO₄ that will be needed to react completely with one mole of ferrous oxalate (FeC₂O₄) in acidic solution is (a) 3/5 (b) 2/5 (c) 4/5 (d) 1”. A typical copy-paste flattens it: KMnO4 and FeC2O4 lose their subscripts and each fraction breaks into two lines. TestoZa’s AI returns the same question typeset, with <code>$\\ce{KMnO4}$</code>, <code>$\\ce{FeC2O4}$</code> and <code>$\\frac{3}{5}$</code> written for you, ready to edit.</p>`;

const PARTIAL_FALLBACK = `
<p>Example: a question with three correct options (A, B and D), marked +4 with −2 for a wrong option. A student who picks A and B only scores +2 in JEE Advanced (one mark per correct option picked) and 4 × 2 ÷ 3 = 2.67 in TestoZa. A student who picks all three scores +4 in both; a student who picks C scores −2 in both.</p>`;

const BATCH_FALLBACK = `
<p>After a mock, the teacher sees the rank list with each student’s score, marks gained and lost, accuracy and time taken, and, for every question, the share of the batch that got it right, the average time spent on it and how the batch split across options A to D. A question where most of the batch chose the same wrong option points to a misconception worth reteaching.</p>`;

export const JEE_MOCK_TEST_PLATFORM: Guide = {
    meta: JEE_META,
    body: {
        intro: [
            html(`
<p>Ask a JEE faculty member what makes online tests hard and the answer is rarely the exam. It’s the typing. A mechanics question needs a vector and a fraction, an organic question needs a reaction arrow with a catalyst on top, and a maths paper is integrals, determinants and limits from start to finish. Paste them from a Word file into most online test tools and x² turns into x2, Fe³⁺ loses its charge and the integral sign becomes a box.</p>
<p>So institutes settle for one of three bad options. They pay the one person who knows LaTeX, they upload questions as screenshots that nobody can edit and students can’t zoom, or they quietly leave the hard questions out. None of those gives you a mock that feels like JEE, and JEE isn’t a small exam: more than 13 lakh candidates sat the January 2026 session of JEE Main alone. Your students are measured against all of them, so practising on anything less than the real thing costs marks.</p>
<p>This guide is about removing that bottleneck. It covers what a JEE mock has to reproduce, the three pieces of jargon (LaTeX, KaTeX and mhchem) you’ll hear and never need to learn, how AI and TestoZa’s Sy Pad keyboard write the notation for you, and what institutes and students each get out of it. There’s a working Sy Pad further down, so you can try it without signing up.</p>
`),
        ],

        answer:
            'A JEE mock test platform has to do three things: let faculty write JEE-level maths and chemistry quickly, run the paper on the same kind of screen and with the same marking as the real exam, and show every student where the marks went. TestoZa handles the notation two ways. Its AI reads your PDFs, Word files and photos and writes the maths and chemistry for you, and the Sy Pad, an on-screen keyboard in the test builder, builds fractions, integrals, matrices and chemical equations as you tap, so nobody has to learn LaTeX or mhchem. Tests open in an NTA-style exam screen in any browser, marks follow JEE Main’s +4/−1 or any scheme you set, and results show ranks, time per question and how the batch answered each question. Building tests and running live exams is free; exam-security rules, scheduling and branding come with paid plans.',

        sections: [
            {
                id: 'the-paper',
                title: 'What a JEE mock has to reproduce',
                tocLabel: 'The paper',
                kicker: 'Know the target',
                blocks: [
                    html(`
<p>Before choosing any software, be precise about the target. JEE is two exams with different personalities, and a mock that copies the wrong one trains the wrong habits.</p>
<ul class="jee-exams">
<li><strong>JEE Main, Paper 1</strong> <span class="jee-chip">CBT · 3 hours</span> 75 questions for 300 marks. Physics, Chemistry and Mathematics each have 20 multiple-choice and 5 numerical-answer questions, all compulsory; from 2025 the old “attempt any 5 of 10” choice in the numerical section was dropped. A correct answer earns 4 marks and a wrong multiple-choice answer costs 1. Whether a wrong numerical answer also costs a mark has changed over the years (NTA added it by a clarification notice in 2022), so check the current information bulletin and set your mock to match.</li>
<li><strong>JEE Advanced</strong> <span class="jee-chip">CBT · 2 papers × 3 hours</span> Two compulsory papers on the same day, set by one of the IITs. The question types and marks change from year to year and the paper states them on the day. Recent papers have mixed single-correct questions, one-or-more-correct questions with partial marks and −2 for a wrong option, numerical answers entered to two decimal places, and List-I/List-II matching.</li>
</ul>
<p>Four things separate a real JEE mock from a question bank with a timer:</p>
<ol class="gd-criteria">
<li><strong>The notation.</strong> Every paper is dense with it: integrals and limits, determinants and matrices, vectors, ions with charges, reactions with conditions over the arrow. If a formula doesn’t look the way it would in print, the question gets harder than intended, or ambiguous.</li>
<li><strong>The screen.</strong> JEE is a computer-based test with a question palette, mark-for-review states and an on-screen keypad for numerical answers. Students should meet that screen dozens of times before the exam.</li>
<li><strong>The marking.</strong> +4/−1 for JEE Main; partial marks and −2 for JEE Advanced multi-correct questions; numerical answers that may be rounded. A mock that marks differently teaches the wrong risk-taking.</li>
<li><strong>The analysis.</strong> A score out of 300 says little on its own. Students need their time per question and the questions that cost them; faculty need to see which questions the whole batch got wrong, and which wrong option they chose.</li>
</ol>
<p>The screen, the marking and the analysis are the job of exam software, and our <a href="/cbt-exam-software">CBT exam software guide</a> covers the screen piece by piece. The notation is where most JEE mocks fall over, so that’s where we’ll start.</p>
`),
                ],
            },
            {
                id: 'notation',
                title: 'The notation problem, and the three words behind it',
                tocLabel: 'Notation',
                kicker: 'LaTeX, KaTeX, mhchem',
                blocks: [
                    html(`
<p>Search for how to put maths in an online test and three words come up almost at once. Here’s everything you need to know about them:</p>
<ul class="jee-terms">
<li><span class="jee-term">LaTeX</span><strong>A way of writing maths as plain text.</strong> <code>\\frac{1}{2}</code> means one half, <code>x^{2}</code> means x squared and <code>\\int</code> is the integral sign. Research papers and many printed JEE books are typeset with it. It’s precise, and it takes weeks to become fluent.</li>
<li><span class="jee-term">KaTeX</span><strong>The engine that draws LaTeX in a browser.</strong> It turns the code into the neat maths you see on a screen, fast enough for a budget phone. TestoZa uses it to draw every formula your students see.</li>
<li><span class="jee-term">mhchem</span><strong>The chemistry add-on.</strong> Inside <code>\\ce{…}</code> you write <code>H2SO4</code> or <code>2H2 + O2 -&gt; 2H2O</code> the way you’d say it, and the subscripts, charges and arrows come out right.</li>
</ul>
<p>The point of this section is simple: <strong>you don’t need to learn any of them.</strong> On TestoZa the code is written for you in two ways. The AI writes it when it reads your files, and the Sy Pad writes it when you tap keys. The table shows what that means in practice: what you want, what you do, the code that gets written for you, and what your students see.</p>
`),
                    { type: 'widget', widget: 'notation-table', fallbackHtml: NOTATION_FALLBACK },
                    html(`
<p>If you already know LaTeX, nothing stops you typing it. Put maths between <code>$ … $</code> in any question or option box and a live preview appears underneath. The <a href="/user-guide/notation-math">maths notation</a> and <a href="/user-guide/chemistry-notation">chemistry notation</a> pages of our user guide list what’s supported, tables and matching lists included.</p>
`),
                ],
            },
            {
                id: 'ai',
                title: 'Let AI do the typing: PDFs, Word files and photos',
                tocLabel: 'AI import',
                kicker: 'Step one',
                blocks: [
                    html(`
<p>Most faculty already have the questions. They’re in last year’s test-series PDFs, in DPPs typed in Word, in a module you photographed, or handwritten on the back of an answer sheet. The fastest way to a mock is to let AI read what you have.</p>
<p>Open the <a href="/generate-with-ai">AI test generator</a>, upload PDFs, Word files, PowerPoint slides or photos (or use your phone’s camera), and pick a mode:</p>
<div class="gd-tools">
<article class="gd-tool" data-mark="⇣" data-tone="blue"><h3>Extract</h3>
<p>Keeps your questions exactly as they are: the wording, the options and the diagrams. Use it for previous-year papers, test series and question banks.</p></article>
<article class="gd-tool" data-mark="✦" data-tone="violet"><h3>Generate</h3>
<p>Writes new questions from a chapter, your notes or a textbook page, at the difficulty you choose: Easy, Moderate or Tough. Use it when a topic needs fresh practice.</p></article>
<article class="gd-tool" data-mark="अ" data-tone="orange"><h3>Language and instructions</h3>
<p>Keep the material’s language, or ask for English, Hindi or both for bilingual batches. A custom-instructions box takes notes like “4 marks each, 1 negative” or “at least 30 questions”.</p></article>
</div>
<p>In both modes the AI writes maths as LaTeX and chemistry as mhchem while it reads, so formulas arrive typeset instead of flattened. Here’s the difference on a classic JEE chemistry question:</p>
`),
                    { type: 'widget', widget: 'ai-before-after', fallbackHtml: AI_FALLBACK },
                    html(`
<p>For a single question there’s a quicker route inside the test builder. Every question card has a <strong>Fill from photo</strong> button: photograph a printed or handwritten question and the card fills itself, question and options included. If the answer is ticked or circled in the photo, or written as “Ans: (b)”, that option is marked correct; if not, you’re asked to tap it. The AI never solves the question to guess an answer. A diagram in the photo is cut out and attached to the question.</p>
<p>One rule we’d ask every faculty member to keep: read the paper once before it goes live. AI reads well, not perfectly, and a smudged exponent or a misread subscript changes a JEE answer. The builder shows every formula rendered, so the check takes minutes. To make the AI follow your institute’s format, the <a href="/user-guide/ai-prompt-guide">AI prompts page</a> has ready-made prompts, and a whole paper with sections and solutions can go in as a file through <a href="/user-guide/bulk-test-upload">bulk upload</a>.</p>
`),
                ],
            },
            {
                id: 'sy-pad',
                title: 'The Sy Pad: a maths and chemistry keyboard for people who never learned LaTeX',
                tocLabel: 'Sy Pad',
                kicker: 'Step two',
                blocks: [
                    html(`
<p>AI brings most of a paper in. The Sy Pad handles everything else: the question you’re writing from scratch, the option the AI misread, the step you want to add to a solution. It’s an on-screen keyboard for maths and chemistry, and it works like the keyboard on your phone. You tap keys, watch the formula take shape and press Insert. The code is written behind the scenes.</p>
<p><strong>Try it here.</strong> This one has the same keys as the pad in the test builder. Tap anything, or press an example to watch a formula being built key by key.</p>
`),
                    { type: 'widget', widget: 'sypad-playground', fallbackHtml: SYPAD_FALLBACK },
                    html(`
<h3>Where to find it</h3>
<p>The Sy Pad lives in the test builder (<a href="/create-test">Create test</a>). There are three ways to open it:</p>
<ul class="jee-where">
<li><span class="jee-where-icon" aria-hidden="true">Σ</span><span><strong>Maths &amp; symbols</strong>, the button under every question card. It opens the pad and points it at that question.</span></li>
<li><span class="jee-where-icon" aria-hidden="true">⋯</span><span><strong>The ⋯ menu</strong> at the top of the builder, then <strong>Open Sy Pad</strong>.</span></li>
<li><span class="jee-where-icon" aria-hidden="true">▤</span><span><strong>Sy Pad</strong> in the left sidebar, just under Create Test, while you’re on the builder page.</span></li>
</ul>
<p>It docks at the bottom of the screen like a phone keyboard and scrolls the page so the box you’re editing stays in view. Drag its top bar to move it anywhere; double-click the bar to dock it again. Done or Esc closes it.</p>
<h3>How it works, step by step</h3>
<ol class="gd-steps">
<li><strong>Click the box you want to write in.</strong> A question, an option or a passage. The bar at the top of the pad names it, for example “Goes into Question 3 · Option B”.</li>
<li><strong>Pick a tab.</strong> Algebra, Pre-Algebra, Trigonometry, Calculus, Statistics, Physics, Chemistry or Tables. On a computer the number pad stays on screen beside the tab’s symbols; on a phone, the 123 tab switches between the two.</li>
<li><strong>Tap keys and fill the blue boxes.</strong> Keys like the fraction, power, root, integral with limits or the limit arrive with blue boxes for the parts still to fill. The first box is already selected, so just type; click the next box to fill that one.</li>
<li><strong>Watch the preview.</strong> The formula is drawn as you build it, exactly as students will see it. Click anywhere in the preview to move the cursor there.</li>
<li><strong>Press Insert.</strong> The formula lands in your box at the cursor, wrapped in the $ signs the builder needs, and the pad clears for the next one.</li>
</ol>
<h3>Chemistry without the code</h3>
<p>In the Chemistry tab, tap <strong>Formula</strong> and type the way you’d write on the board: <code>H2SO4</code>, <code>Fe^3+</code>, <code>2H2 + O2 -&gt; 2H2O</code>. Numbers after an element become subscripts, charges go up and <code>-&gt;</code> becomes an arrow. Other keys add the reversible arrow ⇌, an arrow with boxes above and below for heat or a catalyst, gas and precipitate arrows, the state symbols (aq), (s), (l) and (g), and K<sub>a</sub>, K<sub>b</sub>, pH and mol. While you’re inside a formula, the hint line turns green and says Chemistry, so you always know which mode you’re typing in.</p>
<h3>Words, tables and matrices</h3>
<p>Maths mode runs letters together in italics, which is right for variables and wrong for words. The violet <strong>Words</strong> key starts a run of plain text inside a formula, so “speed = 5 m/s” reads like English. The <strong>Tables</strong> tab builds the layouts JEE papers use: a Match List grid already labelled P, Q, R, S and 1, 2, 3, 4 for List-I/List-II questions, matrices and determinants for the maths paper, and headed or bordered tables for data.</p>
<h3>Safety nets</h3>
<ul class="gd-checks">
<li><strong>It won’t insert a half-built formula.</strong> If a blue box is still empty, or the formula can’t be drawn, the pad says so and points at the gap. You can still choose Insert anyway.</li>
<li><strong>Delete removes whole symbols.</strong> One press takes out a Greek letter or an empty fraction, never half of one.</li>
<li><strong>Your formula never turns into raw code.</strong> If it can’t be drawn halfway through an edit, the last good version stays on screen with a “keep typing…” tag.</li>
<li><strong>Help is one tap away.</strong> How to opens a cheat sheet: a fraction, a power, a chemical formula, a reaction, heat on the arrow, words inside maths, tables and Greek letters.</li>
</ul>
<p>And if you do know LaTeX, the Sy Pad stays out of your way. The code line under the preview is editable: type <code>\\frac{1}{2}</code> straight in (braces pair themselves), press Enter to insert, or press Copy to take the formula, $ signs included, and paste it anywhere.</p>
`),
                ],
            },
            {
                id: 'build-a-mock',
                title: 'Building a full JEE Main mock, start to finish',
                tocLabel: 'Build a mock',
                kicker: 'Step three',
                blocks: [
                    html(`
<p>Here’s the whole path for a 75-question JEE Main paper. The first one takes an evening; after that it’s mostly checking.</p>
<ol class="gd-steps">
<li><strong>Get the questions in.</strong> Import your paper or DPPs with the AI generator in Extract mode, or start a blank test in the builder. Most faculty mix the two: import what they have and write the rest.</li>
<li><strong>Turn on sections.</strong> Make Physics, Chemistry and Mathematics sections, so the exam screen shows subject tabs and results split by subject.</li>
<li><strong>Set the marks once.</strong> Put +4 and −1 on the test. Every question inherits them unless you override a section or a single question, so the numerical questions can carry a different negative mark if the bulletin says so.</li>
<li><strong>Set the question types.</strong> Single correct for the 20 MCQs, numerical for the 5 numericals. A numerical answer can be one exact value, a list of accepted values, or a range such as 2.24 to 2.26.</li>
<li><strong>Finish with the Sy Pad.</strong> Fix anything the AI misread, write the missing questions, and add diagrams by uploading a picture or pasting a screen snip.</li>
<li><strong>Check it as a student.</strong> Open the test the way your students will, in the NTA-style exam screen, and read every question once.</li>
<li><strong>Set the time and go live.</strong> 180 minutes and no calculator, as in JEE Main. Then Conduct gives the paper its own exam link for your batch.</li>
</ol>
<p>For JEE Advanced, build Paper 1 and Paper 2 as two tests and link them as a combined test, which puts a timed break between the papers (30 minutes unless you change it). Multi-correct questions, numerical answers and List-I/List-II matching all work. There’s one difference in how partial marks are counted, which is next.</p>
`),
                ],
            },
            {
                id: 'marking',
                title: 'Marking exactly like JEE, and the one place it differs',
                tocLabel: 'Marking',
                kicker: 'Getting the numbers right',
                blocks: [
                    html(`
<p>Marks on TestoZa are set at three levels, the whole test, a section and a single question, and the most specific one wins. Negative marks accept fractions, so a third of a mark is exactly 1/3, not 0.33. Scores are calculated on our server from the saved answers, never in the student’s browser.</p>
<ul class="gd-checks">
<li><strong>JEE Main.</strong> +4 and −1 on the test covers the MCQs. Give the numerical questions whatever negative mark the year’s bulletin states.</li>
<li><strong>Numerical answers to two decimal places.</strong> JEE Advanced asks candidates to round or truncate to two decimals, so an answer of 0.745 could be entered as 0.74 or 0.75. Set the answer as a range and both are marked correct.</li>
<li><strong>Old “any 5 of 10” papers.</strong> JEE Main papers from 2021 to 2024 let candidates choose 5 of 10 numerical questions per subject. Section attempt control reproduces that: stop students after five answers, or let them answer more and count their first five or their best five.</li>
<li><strong>Multi-correct questions.</strong> Any wrong option costs the negative mark you set (−2 for JEE Advanced), and picking some of the right options with no wrong one earns partial credit.</li>
</ul>
<p>That last point is the one place TestoZa doesn’t copy JEE exactly. JEE Advanced gives one mark for each correct option a candidate picks, and the full 4 only when they pick them all. TestoZa divides the question’s marks by the number of correct options. The two agree whenever all four options are correct, whenever a student picks every correct option, and whenever a student picks a wrong one. They differ when two or three options are correct and a student stops short. Try a few combinations:</p>
`),
                    { type: 'widget', widget: 'partial-marks', fallbackHtml: PARTIAL_FALLBACK },
                    html(`
<p>The difference is at most one mark on a question, always in the student’s favour. It rarely changes a rank, but tell your batch before a JEE Advanced mock so nobody reads two-thirds of a mark as something the real exam would give.</p>
`),
                ],
            },
            {
                id: 'institutes',
                title: 'What an institute gets',
                tocLabel: 'Institutes',
                kicker: 'For coaching institutes',
                blocks: [
                    html(`
<p>An institute’s problem is never one mock. It’s a test every week for every batch, from the Class 11 foundation batch to the droppers, all year. Here’s what changes when making the paper stops being the bottleneck.</p>
<div class="gd-tools">
<article class="gd-tool" data-mark="◷" data-tone="blue"><h3>Faculty time goes back to teaching</h3>
<p>A paper that took a Sunday to type is imported in minutes, and the rest of the time goes into checking and discussing it. Any faculty member can write notation with the Sy Pad, so the paper no longer waits for the one colleague who knows LaTeX.</p></article>
<article class="gd-tool" data-mark="▦" data-tone="violet"><h3>Every test looks like JEE</h3>
<p>Tests open in the NTA-style Standard Mode by default: question palette, Save &amp; Next, mark for review and the on-screen keypad. Students meet the real interface every week, not once in January.</p></article>
<article class="gd-tool" data-mark="अ" data-tone="orange"><h3>Hindi and English batches</h3>
<p>Extract or generate questions in English, Hindi or both. In the builder, faculty can type Hindi with English letters: “namaste” becomes नमस्ते.</p></article>
<article class="gd-tool" data-mark="↗" data-tone="pink"><h3>Results the same evening</h3>
<p>Scores are calculated as papers arrive. You get a rank list, subject-wise scores and, for every question, how many got it right, the average time spent and how the batch split across the options.</p></article>
<article class="gd-tool" data-mark="⚙" data-tone="slate"><h3>Control when you need it</h3>
<p>Every live exam gets its own link, and only you see the results. Paid plans add full screen, tab-switch limits, scheduled exam windows, start forms, your institute’s name and logo, held results and Excel export.</p></article>
</div>
<p>Here’s what the analysis looks like after a Sunday mock:</p>
`),
                    { type: 'widget', widget: 'batch-report', fallbackHtml: BATCH_FALLBACK },
                    html(`
<p>The option split is the part faculty end up using most. When most of a batch picks the same wrong option, that isn’t carelessness, it’s a misconception, and it tells you exactly what to reteach on Monday. The analysis also shows how well each question separated your strongest students from the rest, a quick way to catch a question that’s ambiguous or wrongly keyed.</p>
<p>A rhythm that works for most institutes: a chapter test every week on students’ own phones, a part test every month, and, as JEE Main gets close, full-length mocks in the computer lab at 9 a.m. or 3 p.m., the times the real shifts start. The <a href="/user-guide/conduct-exam">conduct-exam guide</a> walks through going live, and <a href="/online-test-for-coaching">TestoZa for coaching institutes</a> covers the plans for larger teams.</p>
`),
                ],
            },
            {
                id: 'students',
                title: 'What a student gets, with or without an institute',
                tocLabel: 'Students',
                kicker: 'For JEE aspirants',
                blocks: [
                    html(`
<p>Not every aspirant is in a big institute’s test series, and even those who are run short of papers in the last few months. TestoZa works for a student on their own.</p>
<ul class="jee-student">
<li><strong>Make your own mocks.</strong> Photograph a chapter’s exercise, an old paper or a page of your module, and the AI turns it into a timed test. Keep it private, set +4/−1 and the timer, and take it on the NTA-style screen.</li>
<li><strong>Practise the screen, not just the syllabus.</strong> The palette, mark for review and the numerical keypad become automatic, so on the day your attention goes to the questions.</li>
<li><strong>See where the marks went.</strong> Results show your score, accuracy and time on every question, split by subject, with correct, wrong, partly correct and skipped questions counted.</li>
<li><strong>Talk through your mistakes.</strong> An AI mentor on the results page knows which questions you got wrong and can walk you through them.</li>
<li><strong>Get a rough rank estimate.</strong> For tests tagged JEE Main or JEE Advanced you can ask for an estimated rank for your score. Treat it as a direction, not a prediction.</li>
<li><strong>Retake and compare.</strong> Sign in and your attempts stay in your history, so you can see whether the fourth mock went better than the first.</li>
</ul>
<p>One piece of advice from the teachers we work with: take full mocks at exam time, in one sitting, on a laptop or desktop if you can, and take chapter tests on your phone whenever you like. Then spend as long reviewing a mock as you spent writing it. The review is where the marks are.</p>
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
<ul class="jee-limits">
<li><strong>JEE Advanced partial marks are proportional.</strong> As the marking section shows, a partly correct multi-correct answer can score up to one mark more than in the real exam.</li>
<li><strong>AI needs a human check.</strong> A blurred subscript or a faint minus sign can change an answer. Read the paper once before it goes live.</li>
<li><strong>A browser isn’t a test centre.</strong> Full-screen and tab-switch rules make cheating harder, not impossible. Run the mocks that matter in a supervised lab.</li>
<li><strong>Time’s up needs a tap.</strong> When the clock runs out, answering locks, but the student still confirms the submission.</li>
<li><strong>Some controls are paid.</strong> Exam-security rules, scheduling, start forms, branding and Excel export come with the weekly, monthly or yearly plans on the <a href="/pricing">pricing page</a>. Building tests, the Sy Pad, AI import (with hourly limits) and live exam links are free.</li>
</ul>
<p>We’d rather you read these here than discover them during a mock.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'What is the best JEE mock test platform for coaching institutes?',
                a: 'Look for four things: JEE notation that renders exactly (integrals, matrices, chemical equations), an NTA-style exam screen, marking that matches JEE Main and JEE Advanced, and per-question analysis for the whole batch. TestoZa does all four in any browser, with AI import and the Sy Pad keyboard so faculty never need LaTeX. It is free to start; exam-security rules, scheduling and branding are on paid plans.',
            },
            {
                q: 'Do I need to know LaTeX to create JEE questions on TestoZa?',
                a: 'No. The AI writes the LaTeX and mhchem code when it reads your PDFs, Word files and photos, and the Sy Pad keyboard writes it when you tap keys. You only ever see the finished formula. If you know LaTeX you can also type it directly between $ signs.',
            },
            {
                q: 'What is the Sy Pad and where do I find it?',
                a: 'The Sy Pad is TestoZa’s on-screen maths and chemistry keyboard in the test builder. Open it with the Maths & symbols button under any question, with Open Sy Pad in the builder’s ⋯ menu, or with Sy Pad in the sidebar under Create Test. It has tabs for algebra, trigonometry, calculus, statistics, physics, chemistry and tables, draws the formula as you build it, and inserts it into the box you clicked.',
            },
            {
                q: 'How do I type chemical equations in an online test?',
                a: 'In the Sy Pad’s Chemistry tab, tap Formula and type the equation as plain text, for example MnO4^- + 8H+ + 5e- -> Mn^2+ + 4H2O. Subscripts, charges and the arrow are formatted automatically with mhchem. Other keys add the reversible arrow, conditions over the arrow and state symbols.',
            },
            {
                q: 'Can TestoZa turn a JEE PDF or DPP into an online test?',
                a: 'Yes. Upload the PDF, Word file, PowerPoint or photos to the AI test generator and choose Extract to keep the questions, options and diagrams as they are. Maths and chemistry come out typeset. Check the draft in the builder, then publish it or run it as a live exam.',
            },
            {
                q: 'Does TestoZa support JEE Main marking and numerical questions?',
                a: 'Yes. Set +4 and −1 on the test and override them per section or per question. Numerical questions accept one exact value, a list of accepted values or a range, and students enter them on an on-screen keypad as in the real exam.',
            },
            {
                q: 'Can I create JEE Advanced multi-correct questions with partial marking?',
                a: 'Yes. A student who picks some of the correct options and no wrong one gets partial credit, and any wrong option costs the negative mark you set, such as −2. TestoZa’s partial credit is proportional (marks × options picked ÷ correct options), so when two or three options are correct it can give up to one mark more than JEE Advanced’s one-mark-per-option rule.',
            },
            {
                q: 'Can students take JEE mock tests on a phone?',
                a: 'Yes, in any modern browser, with nothing to install. The exam screen, question palette and numerical keypad all work on phones. For full-length mocks, a laptop or a computer lab is closer to the real exam.',
            },
            {
                q: 'Is TestoZa free for JEE mock tests?',
                a: 'Creating tests, the Sy Pad, AI import (with hourly limits), taking tests and running live exams with results are free. Paid weekly, monthly and yearly plans add exam-security rules such as full screen and tab-switch limits, scheduling, start forms, institute branding and Excel export.',
            },
            {
                q: 'Can a student make their own JEE mock tests?',
                a: 'Yes. Sign in for free, upload or photograph chapter exercises or old papers in the AI test generator, set +4/−1 and a timer, keep the test private and take it on the NTA-style screen. Results show accuracy, time per question and the questions that cost the most marks.',
            },
            {
                q: 'Can I make Hindi or bilingual JEE papers?',
                a: 'Yes. The AI can keep the material’s language or write the questions in English, Hindi or both. In the builder, each question has a हिंदी switch that lets you type Hindi with English letters.',
            },
        ],

        closingTitle: 'Build your first JEE mock this week',
        closing: [
            html(`
<p>Start from whatever you already have:</p>
<div class="gd-paths">
<a class="gd-path" href="/generate-with-ai"><span class="gd-path-who">Have PDFs or DPPs?</span><span class="gd-path-what">Turn them into a JEE mock with AI</span></a>
<a class="gd-path" href="/create-test"><span class="gd-path-who">Writing from scratch?</span><span class="gd-path-what">Open the builder and the Sy Pad</span></a>
<a class="gd-path" href="/generate-with-ai"><span class="gd-path-who">Preparing on your own?</span><span class="gd-path-what">Photograph a chapter, take a timed mock</span></a>
</div>
<p>Related reading: <a href="/cbt-exam-software">CBT exam software</a>, <a href="/create-mock-test-online">how to create a mock test online</a>, <a href="/best-online-test-platform">how to choose an online test platform</a>, <a href="/online-test-for-coaching">TestoZa for coaching institutes</a> and <a href="/pricing">pricing</a>.</p>
`),
        ],

        sources: [
            {
                label: 'JEE Main',
                links: [
                    { label: 'NTA JEE Main', href: 'https://jeemain.nta.nic.in/' },
                    {
                        label: 'Session 1 2026 results: 13,04,653 appeared (Careers360)',
                        href: 'https://news.careers360.com/jee-mains-toppers-list-2026-out-12-male-score-100-percentile-session-1-shreyas-mishra-narendrababu-rajasthan-outperforms-nta',
                    },
                    {
                        label: 'Negative marking added to Section B in 2022 (Careers360)',
                        href: 'https://news.careers360.com/jee-mains-2022-nta-introduces-negative-marking-for-section-b-know-marking-scheme',
                    },
                    { label: '2026 exam pattern (ALLEN)', href: 'https://allen.in/jee-main/exam-pattern' },
                ],
            },
            {
                label: 'JEE Advanced',
                links: [
                    { label: 'JEE Advanced', href: 'https://jeeadv.ac.in/' },
                    { label: 'Exam pattern and marking (Careers360)', href: 'https://engineering.careers360.com/articles/jee-advanced-exam-pattern' },
                ],
            },
            {
                label: 'Notation',
                links: [
                    { label: 'The LaTeX Project', href: 'https://www.latex-project.org/' },
                    { label: 'KaTeX', href: 'https://katex.org/' },
                    { label: 'mhchem', href: 'https://mhchem.github.io/MathJax-mhchem/' },
                ],
            },
        ],
    },
};
