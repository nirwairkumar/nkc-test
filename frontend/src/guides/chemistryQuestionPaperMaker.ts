/**
 * testoza.com/chemistry-question-paper-maker — how to make a chemistry question paper,
 * test or quiz online with real formulas and reactions: why chemistry breaks in online
 * forms, four ways to get it in (AI import from a PDF or photo, fill from a photo, the Sy
 * Pad's Chemistry keys, mhchem between dollar signs), structures as pictures, question
 * types and fair numerical answers (pH), marking for NEET, JEE Main, CUET and CBSE, what
 * students see on a phone, what the wrong options tell a teacher, a comparison with
 * Google Forms and Microsoft Forms, mistakes and honest limits. Written for chemistry
 * teachers in schools, coaching institutes and tutors, with TestoZa as the worked example.
 *
 * Outside facts (sources in `sources`, checked 5 October 2026):
 *   - CBSE Class XII Chemistry (043) sample paper 2026-27 ("no change in the question paper
 *     design"): 3 hours, 70 marks, 33 questions; Section A 16 MCQs × 1 (Q13–16 assertion–
 *     reason), B 5 × 2, C 7 × 3, D 2 case-based × 4, E 3 × 5; "Use of log tables and
 *     calculators is not allowed." Copying Q17(B)(II) out of the PDF gives
 *     "Fe2+ + Cr2O7 2-   + H+ " followed by U+F0E0 (a symbol-font arrow); Q25(II) gives
 *     "6 × 10–3 g".
 *   - CUET (UG) 2026 Information Bulletin (NTA): 50 questions per test paper, all
 *     compulsory, 60 minutes, +5 / −1, CBT; Chemistry is subject 306.
 *   - NEET UG: 180 compulsory single-correct questions, 45 in Chemistry, +4 / −1, 3 hours
 *     (see neetOnlineTestSoftware.ts). JEE Main: Chemistry 20 MCQs + 5 numerical, all
 *     compulsory, +4 / −1 on MCQs; numerical negative marking as the year's bulletin says
 *     (see jeeMockTestPlatform.ts).
 *   - Google Forms has no subscript or superscript editor (teachers paste characters);
 *     Microsoft's answer forum: subscripts and superscripts can't be typed in Microsoft
 *     Forms; its Math mode is an equation editor for maths quizzes (Microsoft 365).
 *     Neither has negative marking built in; Microsoft Forms can't take a range as a quiz
 *     answer; Google grades short answers by exact text (see mathTestMaker.ts).
 *   - KaTeX's mhchem extension renders \ce{} and \pu{}; PubChem Sketcher is a free
 *     browser-based structure editor (US National Library of Medicine).
 *
 * TestoZa claims checked against the code on 5 October 2026:
 *   - Renderer (ui/LatexRenderer.tsx): KaTeX with mhchem (\ce, \pu); "ce{" written without
 *     its backslash is repaired; the question box scrolls sideways (overflow-x-auto).
 *   - AI import prompt (backend ai_preview_importer/pdf_vision_pipeline.py): formulas,
 *     ions, states, isotopes in \ce{} inside $…$, also in options; structures, reaction
 *     schemes, graphs and apparatus cropped (figure_crops.py), including drawings that are
 *     the options; match-the-following as an array table; section-wise papers (Physics,
 *     Chemistry, …) come back as sections. Word/PowerPoint refused with Save As → PDF.
 *   - Fill from a photo (test-builder/PhotoFillSheet.tsx, backend routers/ai.py): one
 *     question, printed or handwritten; mhchem for chemistry; diagram box cropped; answer
 *     ticked only from marks in the photo. Sample photos include "Tables & chemistry"
 *     (/sample-questions-showcase/chemistry-table-question.png, the hero's photo).
 *   - Sy Pad Chemistry tab (components/math-keyboard/keys.ts, MathKeyboard.tsx): Formula
 *     (\ce{}: "type the formula as plain text … Numbers become small automatically"), →, ⇌,
 *     arrow with boxes above and below, ↑, ↓, Δ, °C, (aq) (s) (l) (g), Kₐ, K_b, pH, mol;
 *     Tables tab with Match List.
 *   - Exam screen (pages/TestPage.tsx): question image under the text; option images
 *     (max 200 × 200) in their options; text size 12–32 px; numerical keypad (digits, one
 *     point, a leading minus). Teacher analysis (FullTestAnalysisPage.tsx): option
 *     breakdown, accuracy, average time, discrimination; below 40% accuracy → "Hard".
 *   - Everything else (marks per test/section/question, multiple-correct partial credit,
 *     calculator switch, range or exact numerical answers, solutions, plans from ₹49 a
 *     week, Hindi switch, LaTeX to PDF with mhchem): as checked for mathTestMaker.ts.
 *   - NOT in the product: a structure-drawing editor, answers typed as formulas or names,
 *     long-answer or step marking, 3D models or simulations, printing the test as a paper.
 */
import { CHEMISTRY_META } from './meta';
import { DICHROMATE, EXAM, IMPORTS, NOTATION, NUMERIC, OPTION_KEYS, OPTION_SPLIT, PAPER } from './chemData';
import { isNumericalCorrect } from '../utils/numericalAnswer';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

/** Code shown as text in HTML (mhchem arrows contain < and >). */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ── Crawler versions of the demos ────────────────────────────────────── */

const PASTE_FALLBACK = `
<p>One line from CBSE’s Class 12 Chemistry sample paper for 2026-27 (“Complete and balance the following reaction”), shown four ways on a student’s phone:</p>
<ul>
<li><strong>Typed into a form field:</strong> <code>${esc(DICHROMATE.typed)}</code>. Readable to the teacher who typed it; students now decode carets and arrows under a timer.</li>
<li><strong>Copied out of the PDF:</strong> <code>Fe2+ + Cr2O7 2- + H+</code> followed by an empty box. “Fe2+” could be Fe₂⁺, the 2− has left the dichromate ion, and the arrow, drawn in a symbol font, can’t be shown.</li>
<li><strong>Pasted as a screenshot:</strong> sharp at its own size, blurred when a student zooms in, a white box in dark mode, and impossible to correct without making a new picture.</li>
<li><strong>Typeset in TestoZa:</strong> ${DICHROMATE.plain}, drawn as text from <code>${esc(DICHROMATE.tex)}</code>, sharp at any zoom and following the student’s text size.</li>
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
    .map((q) => `<li>${q.plain}${q.image ? ' [structure cropped from the page and attached]' : ''} ${OPTION_KEYS.map((k) => `(${k}) ${q.optionsPlain?.[k]}`).join(' ')}. Answer: (${q.answer}).</li>`)
    .join('\n')}
</ol>`;
    })
    .join('\n')}
<p>Every formula is stored as mhchem between dollar signs; the review screen’s Raw button shows it, for example <code>${esc(IMPORTS.photo.questions[0].text)}</code>.</p>
`;

const SYPAD_FALLBACK = `
<p>A working copy of the Sy Pad, TestoZa’s maths and chemistry keyboard, sits here on the page, open on its Chemistry tab. Tap Formula and type a formula as plain letters (H2SO4, Fe^3+, 2H2 + O2 -&gt; 2H2O): numbers become subscripts, ^3+ becomes a charge and -&gt; an arrow. Other keys give ⇌, an arrow with boxes above and below for a catalyst or Δ, ↑ for a gas, ↓ for a precipitate, the state symbols (aq), (s), (l) and (g), °C, Kₐ, K_b, pH and mol. Three replays build a redox half-reaction (<code>${esc(String.raw`\ce{MnO4^- + 8H+ + 5e- -> Mn^2+ + 4H2O}`)}</code>), the decomposition of potassium chlorate with MnO₂ above the arrow and Δ below it, and the equilibrium constant K<sub>c</sub> = [NH₃]² / ([N₂][H₂]³), key by key. Insert drops the result into a sample question.</p>
`;

const NOTATION_FALLBACK = `
<div class="cq-table-wrap"><table class="cq-table">
<thead><tr><th scope="col">You want</th><th scope="col">Type this between $ signs</th><th scope="col">Students see</th></tr></thead>
<tbody>
${NOTATION.map((r) => `<tr><th scope="row">${r.want}</th><td data-label="Type"><code>${esc(r.type)}</code></td><td data-label="Students see">${r.plain}</td></tr>`).join('\n')}
</tbody>
</table></div>
`;

const verdict = (setting: (typeof NUMERIC.presets)[number]['setting'], value: string) => (isNumericalCorrect(setting, value) ? 'right' : 'wrong');

const NUMERIC_FALLBACK = `
<p>${NUMERIC.plain} The pH is 2.699…, so 2.70 to two decimal places. Six candidates’ answers, marked under four settings:</p>
<div class="cq-table-wrap"><table class="cq-table">
<thead><tr><th scope="col">Answer typed</th>${NUMERIC.presets.map((p) => `<th scope="col">${p.label}</th>`).join('')}</tr></thead>
<tbody>
${NUMERIC.answers.map((a) => `<tr><th scope="row">${a.value} (${a.name})</th>${NUMERIC.presets.map((p) => `<td data-label="${p.label}">${verdict(p.setting, a.value)}</td>`).join('')}</tr>`).join('\n')}
</tbody>
</table></div>
<p>“Exact: 2.70” fails the candidate who wrote 2.699, which is more precise. “Range 2.6 to 2.8” passes 2.71, which is wrong. The range 2.69 to 2.70 is the fair one.</p>
`;

const EXAM_FALLBACK = `
<p>A six-question chemistry test on TestoZa’s exam screen, drawn at a phone’s real size (${PAPER.title}; +${PAPER.right} for a right answer, −${PAPER.wrong} for a wrong one). Answer, pick a structure from four pictures, change the text size, use the on-screen keypad for the numerical question, then check your marks.</p>
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

export const CHEMISTRY_QUESTION_PAPER_MAKER: Guide = {
    meta: CHEMISTRY_META,
    body: {
        intro: [
            html(`
<p>Ask a chemistry teacher what goes wrong when a paper moves online, and it is rarely the questions. It is the notation. H₂O needs its 2 below the line, Fe³⁺ needs its charge above it, a reaction needs an arrow that can carry a catalyst and a Δ, an equilibrium needs ⇌, and half the organic chapter is drawings. A form field gives you one flat line of text. So teachers type H2SO4 and hope, paste screenshots that blur on a phone, or give up and print the paper again.</p>
<p>This guide is about getting a chemistry paper online without losing any of that. It covers four ways to get formulas and reactions in (from the PDF or photo you already have, by tapping keys, or with a few characters of mhchem), how to handle structures and diagrams, how to set numerical answers such as pH so rounding doesn’t cost a student marks, how to mark the paper the way NEET, JEE Main, CUET or your board does, and what students actually see on their phones. Every demo on this page is working: you can type a reaction, run an import and sit a short test without leaving it.</p>
<p>It is written for chemistry teachers in schools (Classes 9 to 12), coaching institutes preparing students for NEET, JEE and CUET, and private tutors. We use TestoZa as the worked example, and say plainly where it falls short.</p>
`),
        ],
        answer:
            'A good chemistry question paper maker lets you write formulas, charges and reactions without learning code, shows them as sharp text on any phone, takes structures as pictures, and marks numerical answers such as pH fairly. In TestoZa you can upload a question paper as a PDF or photo and AI types every formula and crops the structures; tap formulas in with the Sy Pad’s Chemistry keys (type H2SO4 and the 2 and 4 drop below the line); or write \\ce{} between dollar signs. Students take the test on any phone, with NEET or JEE-style +4/−1 marking.',
        sections: [
            {
                id: 'why-chemistry-is-hard',
                title: 'Why chemistry papers break in online forms',
                tocLabel: 'Why chemistry is hard',
                kicker: 'The problem',
                blocks: [
                    html(`
<p>In chemistry, the small characters carry the meaning. 2H is two hydrogen atoms; H₂ is one molecule of hydrogen. CO is carbon monoxide; Co is cobalt. Fe²⁺ and Fe³⁺ are different ions with different chemistry, and a paper that prints one where it means the other has changed the question. A reaction arrow says which way things go, ⇌ says they go both ways and settle, and MnO₂ written above the arrow says it is a catalyst, not a reactant.</p>
<p>Online forms were built for sentences, and they flatten all of it. <strong>Google Forms has no subscript or superscript formatting</strong>; the usual workaround is to copy characters such as ₂ and ³⁺ one at a time from a character table. <strong>Microsoft Forms</strong> is no better for ordinary text: Microsoft’s own answer forum says subscripts and superscripts can’t be typed in Forms, and teachers paste the same Unicode characters. Its Math mode adds an equation editor, but it is built for maths quizzes. Unicode gets you H₂O. It does not get you an arrow with a catalyst on top, a stacked isotope like ¹⁴₆C, or an equilibrium constant written as a fraction, and every formula turns into a hunt through a character table.</p>
<p>Copying from a PDF is worse than it looks. We copied a question out of CBSE’s own Class 12 Chemistry sample paper for 2026-27 (Question 17(B)(II): “Complete and balance the following reaction”). Fe²⁺ came out as <code>Fe2+</code>, the dichromate ion as <code>Cr2O7 2-</code>, and the reaction arrow, which the PDF draws with a symbol font, came out as a character most phones show as an empty box. Elsewhere in the same paper, “6 × 10⁻³ g of dissolved oxygen” comes out as “6 × 10–3 g”, which a student could fairly read as 6 × 7.</p>
<p>So teachers fall back on four workarounds, and each one hurts somewhere. Switch between them below, then zoom in the way a student squinting at a phone would.</p>
`),
                    { type: 'widget', widget: 'chem-paste', fallbackHtml: PASTE_FALLBACK },
                    html(`
<p>The typeset version isn’t a picture. It is text drawn with KaTeX and its mhchem extension, the same engine TestoZa’s exam screen uses, with a MathML copy underneath for screen readers. For this line that is 29 bytes of text against 2,890 bytes for a tight screenshot of it, about 100 times more, and a phone photo of a page is far bigger again. On a slow connection, a paper with forty screenshots loads in pieces; a paper written as text arrives at once. (If you were working the question: 6Fe²⁺ + Cr₂O₇²⁻ + 14H⁺ → 6Fe³⁺ + 2Cr³⁺ + 7H₂O.)</p>
`),
                ],
            },
            {
                id: 'four-ways',
                title: 'Four ways to get a chemistry paper online, and when to use each',
                tocLabel: 'Four ways in',
                kicker: 'The short version',
                blocks: [
                    html(`
<p>You rarely start from nothing. Usually there is last year’s unit test, a DPP sheet, a page of a reference book, or a question scribbled in a notebook. Pick the way in that matches what you already have:</p>
<div class="cq-table-wrap"><table class="cq-table">
<thead><tr><th scope="col">You have</th><th scope="col">Do this</th><th scope="col">Best for</th><th scope="col">Watch for</th></tr></thead>
<tbody>
<tr><th scope="row">A question paper, DPP or worksheet as a PDF, or photos of one</th><td data-label="Do this">Upload it; AI types every question, formula and reaction, and crops the structures</td><td data-label="Best for">A whole paper at once, 20 to 100 questions</td><td data-label="Watch for">Read it once before it goes live: a lost charge sign changes the question</td></tr>
<tr><th scope="row">One question in a book or a notebook</th><td data-label="Do this">Fill from a photo: snap it, and the question and options are typed into the box you were on</td><td data-label="Best for">Adding a question or two to a test you are building</td><td data-label="Watch for">The answer is ticked only if it is marked in the photo; nothing is solved for you</td></tr>
<tr><th scope="row">A new question in your head</th><td data-label="Do this">Open the Sy Pad’s Chemistry tab, tap Formula and type H2SO4 as plain letters; arrows, ⇌ and states are keys</td><td data-label="Best for">Teachers who have never typed code</td><td data-label="Watch for">Put a catalyst on the arrow (the key with boxes), never in the reactants</td></tr>
<tr><th scope="row">A little mhchem</th><td data-label="Do this">Type <code>\\ce{…}</code> between dollar signs straight into the question or an option</td><td data-label="Best for">Speed, once you know a dozen patterns</td><td data-label="Watch for">Spaces around + between species: <code>\\ce{Na + Cl2}</code>, because <code>Na+</code> is the ion</td></tr>
</tbody>
</table></div>
<p>They mix freely. A typical week looks like this: import last year’s chapter test, fix two charges with the Sy Pad, add a fresh question from a photo of the reference book, and type a quick <code>$\\ce{CuSO4.5H2O}$</code> in an option without opening anything. All four end up in the same place: text with chemistry between dollar signs, which is what the exam screen draws. If a formula is ever typed as <code>ce{H2O}</code> without its backslash, TestoZa repairs it before drawing.</p>
`),
                ],
            },
            {
                id: 'from-a-paper',
                title: 'From a PDF or a photo: let AI type the chemistry',
                tocLabel: 'From a PDF or photo',
                kicker: 'Already have the paper',
                blocks: [
                    html(`
<p>If a paper already exists, don’t retype it. On TestoZa, <a href="/generate-with-ai">upload a question paper</a> as a PDF or as photos (a Word or PowerPoint file needs one extra step: open it and choose File → Save As → PDF). You pick one of two jobs:</p>
<ul>
<li><strong>Extract</strong> keeps your questions exactly as printed: the wording, the options, the order, and the answers where the paper prints them or has a key.</li>
<li><strong>Generate</strong> reads a chapter or your notes and writes new questions from them, at the difficulty you choose (Easy, Moderate or Tough).</li>
</ul>
<p>Either way, every formula and reaction is written in mhchem, so subscripts, charges, state symbols, isotopes, arrows and ⇌ come out typeset instead of flattened, in the options as well as the questions. Structures, reaction schemes, graphs and apparatus diagrams are cropped from the page and attached to their questions, and when the options themselves are structures, each drawing is cropped into its own option. Match-the-columns lists become proper tables, and a paper divided into Physics, Chemistry and Biology, or into Sections A and B, comes back in those sections. Before anything is saved you get a review screen: each question with its options and the correct answer ticked, a chip saying which page it came from, and a <strong>Raw</strong> button that shows the code behind the formatting, in case you want to check a charge.</p>
<p>Try it with three kinds of file. The review screen below is the product’s own; the questions were written for this page, and the structure is one of TestoZa’s own sample images.</p>
`),
                    { type: 'widget', widget: 'chem-ai-import', fallbackHtml: AI_FALLBACK },
                    html(`
<p>One rule we’d ask every teacher to keep: <strong>read the paper once before students see it.</strong> AI reads printed chemistry well and handwriting reasonably, but not perfectly, and the mistakes that matter in chemistry are small ones: a charge read as a dash, so SO₄²⁻ becomes SO₄2−; a subscript read as a coefficient; CO read as Co; Cl read as CI; (l) read as (1); ⇌ read as →. The review screen draws every formula, so the check takes a few minutes for a whole paper, and you can fix anything in the editor afterwards.</p>
<p>For a single question, <strong>Fill from a photo</strong> is quicker than an import. Open it from the question you are on, take or choose a photo of one question, printed or handwritten, and the question and its options are typed into that box, formulas in mhchem and the structure cropped if there is one. It ticks an answer only when the photo shows one marked; it never solves the question for you, which is the right way round for a test. The animation at the top of this page uses one of its own sample photos: a handwritten K<sub>sp</sub> question whose options are a table of concentrations.</p>
`),
                ],
            },
            {
                id: 'sy-pad',
                title: 'The Sy Pad’s Chemistry keys: formulas without code',
                tocLabel: 'The Chemistry keys',
                kicker: 'Typing new questions',
                blocks: [
                    html(`
<p>For questions you write yourself, TestoZa has the <strong>Sy Pad</strong>, a maths and chemistry keyboard for teachers who have never typed code. You open it from <em>Maths &amp; symbols</em> under any question, from the builder’s ⋯ menu, or from the sidebar while building a test. A chip at the top tells you where the formula will go (“Goes into Question 3 · Option B”), so you never paste into the wrong box.</p>
<p>The Chemistry tab is built around one key: <strong>Formula</strong>. Tap it and type the formula in plain letters, the way you would write it on the board: H2SO4, Fe^3+, 2H2 + O2 -&gt; 2H2O. Numbers after an element drop below the line, ^3+ becomes a charge and -&gt; becomes an arrow, automatically. The other keys cover what plain letters can’t: → and ⇌; an arrow with boxes above and below for a catalyst, a temperature or Δ; ↑ for a gas given off and ↓ for a precipitate; the state symbols (aq), (s), (l) and (g); and °C, K<sub>a</sub>, K<sub>b</sub>, pH and mol. The maths keys sit beside them, so an equilibrium constant or a rate law is just a fraction with formulas in it.</p>
<p>The preview above the keys always shows the line as students will see it. Insert refuses a formula with an empty blue box (unless you choose “Insert anyway”), so a half-finished arrow never reaches students, and the Tables tab makes the match-the-columns grid that NEET papers love. This is a working copy; press a replay to watch a reaction being built, then try your own.</p>
`),
                    { type: 'widget', widget: 'chem-sypad', fallbackHtml: SYPAD_FALLBACK },
                    html(`
<p>The code line under the preview is the mhchem the pad writes for you. You never have to look at it, but it is how many teachers learn mhchem without meaning to: after a week of tapping Formula, <code>\\ce{H2SO4}</code> starts to look familiar. <em>Copy</em> puts the formula on your clipboard with its dollar signs, ready to paste into another question.</p>
`),
                ],
            },
            {
                id: 'mhchem',
                title: 'If you know a little LaTeX: mhchem between dollar signs',
                tocLabel: 'mhchem cheat sheet',
                kicker: 'The fastest way',
                blocks: [
                    html(`
<p>Every question box and option in TestoZa accepts LaTeX between dollar signs, with mhchem for chemistry, and shows a live preview as soon as it sees one. mhchem is the chemistry package most LaTeX users already know: wrap a formula or a whole reaction in <code>\\ce{}</code> and write it nearly as you would on paper; put quantities with units in <code>\\pu{}</code>. You don’t need the whole package. The eighteen lines below cover almost every school and entrance paper; copy any line, paste it into a question, and it renders.</p>
`),
                    { type: 'widget', widget: 'chem-notation', fallbackHtml: NOTATION_FALLBACK },
                    html(`
<p>Five habits keep mhchem trouble-free:</p>
<ul class="cq-checks">
<li><strong>Spaces around + between species.</strong> <code>\\ce{Na + Cl2}</code> is sodium plus chlorine; <code>\\ce{Na+}</code> is the sodium ion.</li>
<li><strong>A caret before a charge with a number.</strong> <code>\\ce{SO4^2-}</code> and <code>\\ce{Fe^3+}</code> can’t be misread, and they are what the AI import and the Sy Pad write.</li>
<li><strong>Capitals exactly as in the formula.</strong> <code>\\ce{CO}</code> is carbon monoxide and <code>\\ce{Co}</code> is cobalt; nothing will correct that for you.</li>
<li><strong>Conditions in square brackets after the arrow,</strong> above first, then below: <code>\\ce{-&gt;[MnO2][\\Delta]}</code>. Never as a reactant.</li>
<li><strong>Maths outside <code>\\ce{}</code>, species inside.</strong> In <code>K_{c} = \\frac{[\\ce{NH3}]^{2}}{[\\ce{N2}][\\ce{H2}]^{3}}</code> the fraction and the powers are maths; only the formulas are chemistry.</li>
</ul>
<p>A long reaction doesn’t break a phone’s screen: it scrolls sideways inside its question instead of wrapping in the middle of a formula. And if you also set maths papers, the same editor handles fractions, integrals and matrices; our <a href="/math-test-maker">math test maker guide</a> covers that side.</p>
`),
                ],
            },
            {
                id: 'structures',
                title: 'Structures, diagrams and apparatus: pictures, done right',
                tocLabel: 'Structures and diagrams',
                kicker: 'Organic chemistry',
                blocks: [
                    html(`
<p>Organic chemistry is drawn, not written, and TestoZa doesn’t have a structure editor. Structures go in as pictures: the AI import crops them from your paper, Fill from a photo crops the one in the question, and you can upload an image to any question or option yourself. On the exam screen a question’s picture sits under its text and each option’s picture sits inside its option, so “Which of the following is the structure of 2-methylbut-2-ene?” with four skeletal structures works the way students expect. Question 3 in the test further down is exactly that.</p>
<p>Pictures are where chemistry papers most often fail on phones, so five rules:</p>
<ul>
<li><strong>Crop tight, on white.</strong> A structure with a page of margin around it is drawn tiny. The import crops to the drawing; if you upload your own, trim it first.</li>
<li><strong>Draw it rather than photograph it, when you can.</strong> A free structure editor such as PubChem Sketcher, from the US National Library of Medicine, gives clean lines that stay legible at phone size; a photo of a textbook page brings its shadow and its tilt.</li>
<li><strong>Keep labels big.</strong> Atom labels, charges and lone pairs drawn at textbook size become specks on a six-inch screen. Look at the picture at phone width before the test.</li>
<li><strong>Names with words, structures with pictures.</strong> “The IUPAC name of the compound shown is” needs a picture in the question and names in the options. “Which structure is …?” needs pictures in the options. A picture and a long caption in the same option is hard to read.</li>
<li><strong>Use text where text works.</strong> A condensed formula such as <code>\\ce{CH3-CH=CH2}</code> or a two-step reaction scheme is sharper and lighter as mhchem than as a picture.</li>
</ul>
<p>Apparatus diagrams, graphs of rate against concentration, titration curves and the periodic-table snippets some questions need follow the same rules. If a picture isn’t needed to answer the question, leave it out: every image is something a student on a slow connection has to wait for.</p>
`),
                ],
            },
            {
                id: 'question-types',
                title: 'Question types for chemistry, and numerical answers that are fair',
                tocLabel: 'Question types',
                kicker: 'Question types',
                blocks: [
                    html(`
<p>TestoZa has four question types, and a chemistry paper uses all of them:</p>
<ul>
<li><strong>Single correct</strong>: the standard four options, and the only type in NEET. Assertion–reason questions are single correct, with the four standard statements as the options (“Both A and R are true, and R is the correct explanation of A”, and so on), the way CBSE sets them in Section A.</li>
<li><strong>Multiple correct</strong>: tick every true statement, as in JEE Advanced questions on the properties of a compound. Partial credit is proportional by default (pick two of three correct options and you get two-thirds of the marks); set a question’s partial marks to JEE Advanced and each correct option is worth +1 instead. Either way, any wrong option costs the negative mark.</li>
<li><strong>Numerical answer</strong>: no options; the student types a number. Moles, molarity, pH, rate constants, the number of isomers, the number of unpaired electrons.</li>
<li><strong>Passage / case study</strong>: one passage with several questions under it, the shape of the case-based questions in Section D of a CBSE paper.</li>
</ul>
<p>Match-the-column questions are single correct too: List-I and List-II go in a table in the question (the Sy Pad’s Tables tab has a Match List layout, and the AI import turns printed lists into tables), and the four codings, such as A-(iv), B-(ii), C-(iii), D-(i), are the options.</p>
<p>Numerical questions need one decision from you: <strong>a range or exact values.</strong> A range (“lowest correct 2.69, highest correct 2.70”) accepts any number in between. Exact values (“10, 10.0”) accept only the numbers listed. Students type with an on-screen number pad, so the phone’s keyboard never covers the question, and they can enter digits, one decimal point and a minus sign, nothing else.</p>
<p>Two things follow for chemistry. A student can’t type 1.2 × 10⁻⁵ into a numerical box, so ask for the number in a stated unit or power (“in units of 10⁻⁵ mol L⁻¹”, “to the nearest integer”), the way JEE Main does. And state the rounding and the log values you want used, because pH questions are where rounding bites hardest. Try the settings below on six real-looking answers to one pH question.</p>
`),
                    { type: 'widget', widget: 'chem-numerical', fallbackHtml: NUMERIC_FALLBACK },
                    html(`
<p>The pattern holds for any rounded answer: <strong>set the range from the truncated value to the rounded value</strong>, here 2.69 to 2.70, and write the rounding rule and the log values in the question. Answers are compared as numbers, so 2.7 and 2.70 are the same and nobody loses marks for a dropped zero. Use exact values for answers that really are exact, such as 10 moles, 4 isomers or 3 unpaired electrons. If your exam asks for the nearest integer, as JEE Main’s numerical questions usually do, ask the same and accept only that integer, so the practice trains the habit.</p>
`),
                ],
            },
            {
                id: 'marking',
                title: 'Marks and negative marking for NEET, JEE Main, CUET and board papers',
                tocLabel: 'Marking',
                kicker: 'Marking',
                blocks: [
                    html(`
<p>Marks in TestoZa can be set for the whole test, for a section, or for a single question, and the most specific one wins. Negative marks accept decimals, so −0.25, −1 and −2 all work. Turn on sections and the exam screen shows section tabs, while results split scores by section. A calculator can be switched on for a test; it opens in basic mode and has a scientific mode. CBSE’s chemistry paper allows neither log tables nor calculators, so for board practice leave it off and give the log values in the question, as the board does.</p>
<p>Copy your exam’s pattern rather than inventing one. Practice that marks differently from the real thing teaches the wrong instincts about when to guess:</p>
<div class="cq-table-wrap"><table class="cq-table">
<thead><tr><th scope="col">Test</th><th scope="col">Question types</th><th scope="col">Marking to set</th><th scope="col">Pace to expect</th></tr></thead>
<tbody>
<tr><th scope="row">School unit test, Classes 9–10</th><td data-label="Question types">Single correct, a few numerical</td><td data-label="Marking to set">+1 or +2, no negative marking</td><td data-label="Pace">1–2 minutes a question</td></tr>
<tr><th scope="row">CBSE Class 12, Section A practice</th><td data-label="Question types">16 single correct, the last four assertion–reason; case studies as passages</td><td data-label="Marking to set">+1 each, no negative marking</td><td data-label="Pace">The whole board paper is 3 hours for 70 marks; Section A is 16 of them</td></tr>
<tr><th scope="row">NEET UG Chemistry</th><td data-label="Question types">45 single correct, including match-the-column and two-statement questions</td><td data-label="Marking to set">+4 / −1 (see our <a href="/neet-online-test-software">NEET test guide</a>)</td><td data-label="Pace">180 questions in 3 hours for the whole paper: a minute a question</td></tr>
<tr><th scope="row">JEE Main Chemistry</th><td data-label="Question types">20 single correct + 5 numerical</td><td data-label="Marking to set">+4 / −1 on the MCQs; the numerical questions as the year’s bulletin says (see our <a href="/jee-mock-test-platform">JEE mock test guide</a>)</td><td data-label="Pace">75 questions across three subjects in 3 hours</td></tr>
<tr><th scope="row">CUET UG Chemistry</th><td data-label="Question types">50 single correct, all compulsory</td><td data-label="Marking to set">+5 / −1</td><td data-label="Pace">60 minutes: just over a minute a question</td></tr>
</tbody>
</table></div>
<p>For entrance batches the clock matters as much as the chemistry. NEET and CUET give barely a minute a question, so physical-chemistry numericals that take four minutes in class have to come down to one; give the real exam’s time and no more. For board practice, the opposite: be generous with time and judge accuracy, because Sections B to E of the board paper reward written working that an online test can’t see.</p>
`),
                ],
            },
            {
                id: 'student-view',
                title: 'What students see: formulas as text, on any phone',
                tocLabel: 'On a student’s phone',
                kicker: 'On the student’s phone',
                blocks: [
                    html(`
<p>Most students in India will take your test on a phone, often a budget Android with a small screen. Three things decide whether a chemistry paper works there, and you can feel all three in the demo below.</p>
<ul>
<li><strong>The chemistry is text.</strong> It stays sharp at any size, and when a student makes the text bigger (the faint − and + at the top right of the question, from 12 to 32 pixels), subscripts, charges and powers of ten grow with it.</li>
<li><strong>Pictures where they are needed.</strong> A question’s structure sits under its text; option structures sit inside their options, up to 200 pixels across, on a white background so they read in any light.</li>
<li><strong>Numbers go in through a keypad.</strong> A numerical question shows an on-screen number pad, the way computer-based exams do, so the phone’s keyboard doesn’t jump up and hide the question.</li>
</ul>
`),
                    { type: 'widget', widget: 'chem-exam', fallbackHtml: EXAM_FALLBACK },
                    html(`
<p>The same screen runs on a laptop or in a computer lab, with the question palette beside the question instead of behind a button. If you want students used to the national computer-based test layout before JEE Main or CUET, this is the layout they will practise on. For running a test at a fixed time with a join code, see our guide to <a href="/how-to-conduct-online-exam">conducting an online exam</a>.</p>
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
<p>Marking is instant, but the score is the least useful number a chemistry test produces. The useful one is <em>which wrong answer</em> students chose. Chemistry has classic traps, and a well-written question puts them in the options: forgetting water’s own H⁺, ignoring a coefficient in K<sub>c</sub>, adding HBr the wrong way round an alkene, confusing grams with moles. When 19 students in 40 pick the same wrong option, you don’t have 19 careless students; you have one lesson to reteach.</p>
<p>TestoZa’s teacher analysis shows this for every question: the share of students who chose each option, how many got it right, the average time spent on it, and a <em>discrimination index</em>, which says whether the students who did well overall got this question right more often than those who didn’t. A common rule of thumb: 0.3 and above, the question separates strong and weak students well; near zero, it doesn’t; and a negative value usually means the question or its answer key is wrong. Tap the options below to see how one question reads.</p>
`),
                    { type: 'widget', widget: 'chem-options', fallbackHtml: OPTIONS_FALLBACK },
                    html(`
<p>Students get their side straight away: which questions they got right, wrong, partly right or skipped, and how long each took. Add a written solution to a question, with formulas typed the same four ways, and students can read it when they review the test. The rank list and full per-question analysis are part of the paid plans, alongside institute branding and exam rules.</p>
`),
                ],
            },
            {
                id: 'compared',
                title: 'TestoZa, Google Forms and Microsoft Forms for chemistry tests',
                tocLabel: 'Compared with Forms',
                kicker: 'Compared',
                blocks: [
                    html(`
<p>Google Forms and Microsoft Forms are fine for a quick check of understanding. For a chemistry paper with real notation and real marking, the differences show up fast:</p>
<div class="cq-table-wrap"><table class="cq-table">
<thead><tr><th scope="col"></th><th scope="col">Google Forms</th><th scope="col">Microsoft Forms</th><th scope="col">TestoZa</th></tr></thead>
<tbody>
<tr><th scope="row">Subscripts and charges in a question</th><td data-label="Google Forms">No formatting; paste Unicode characters one by one</td><td data-label="Microsoft Forms">No text formatting; paste Unicode characters</td><td data-label="TestoZa">Type H2SO4 on the Sy Pad, write mhchem, or let the AI import do it</td></tr>
<tr><th scope="row">Arrows with conditions, ⇌, isotopes</th><td data-label="Google Forms">No</td><td data-label="Microsoft Forms">No (Math mode is built for maths)</td><td data-label="TestoZa">Yes, as text</td></tr>
<tr><th scope="row">Turn an existing paper into a test</th><td data-label="Google Forms">Retype it</td><td data-label="Microsoft Forms">Retype it</td><td data-label="TestoZa">Upload the PDF or photos; structures cropped</td></tr>
<tr><th scope="row">Accept a range of numerical answers</th><td data-label="Google Forms">No: short answers are graded by exact text</td><td data-label="Microsoft Forms">No: a range can’t be a quiz answer</td><td data-label="TestoZa">Yes, or a list of exact values, typed on a keypad</td></tr>
<tr><th scope="row">Negative marking</th><td data-label="Google Forms">Not built in</td><td data-label="Microsoft Forms">Not built in</td><td data-label="TestoZa">Per test, section or question</td></tr>
<tr><th scope="row">Exam-style screen with a timer and palette</th><td data-label="Google Forms">No</td><td data-label="Microsoft Forms">No</td><td data-label="TestoZa">Yes</td></tr>
</tbody>
</table></div>
<p>Where Forms is genuinely enough: a short check on a topic that needs no notation, such as “Which gas turns lime water milky?”, sent to a class that already lives in Google Classroom or Microsoft Teams. Where TestoZa is ahead: the paper you already have becomes a test without retyping, the formulas survive the trip to a cheap phone, and the marking matches NEET, JEE Main and CUET.</p>
`),
                ],
            },
            {
                id: 'mistakes',
                title: 'Ten mistakes that make an online chemistry test unfair',
                tocLabel: 'Ten mistakes',
                kicker: 'Mistakes',
                blocks: [
                    html(`
<ol class="cq-steps">
<li><strong>Formulas typed flat.</strong> H2SO4 is readable; Fe2+ and SO4 2- are not. Is it Fe₂⁺? Is the 2− a charge or a stray number?</li>
<li><strong>The wrong capital letter.</strong> CO for Co, or Cl typed (or scanned) as CI with a capital i. Each one changes the substance.</li>
<li><strong>A coefficient read as a subscript, or the reverse.</strong> 3O₂ and O₃ are different molecules. Check every number in front of and inside a formula after an import.</li>
<li><strong>Conditions written as reactants.</strong> “KClO₃ + MnO₂ + heat →” tells students the catalyst is used up. Put MnO₂ and Δ on the arrow.</li>
<li><strong>An unbalanced equation in the question.</strong> A mole calculation built on an unbalanced equation has two defensible answers. Balance it, or ask students to.</li>
<li><strong>A pH or log question with no log values and no rounding rule.</strong> Two careful students get 2.69 and 2.70 and one of them is marked wrong. Give log 2 = 0.301 and the decimal places.</li>
<li><strong>A range that is too tight, or too loose.</strong> Exact 2.70 fails 2.699; 2.6 to 2.8 passes 2.71. Set the range from truncated to rounded.</li>
<li><strong>Asking for scientific notation in a numerical box.</strong> Students can type 1.2, not 1.2 × 10⁻⁵. Ask for the answer “in units of 10⁻⁵”.</li>
<li><strong>Structures too small, or photographed at an angle.</strong> Crop tight, draw cleanly, and check them at phone width.</li>
<li><strong>Not taking your own test on a phone first.</strong> Five minutes as a student catches the lost charge, the tiny structure and the negative marking you forgot to mention in the instructions.</li>
</ol>
`),
                ],
            },
            {
                id: 'limits',
                title: 'Where TestoZa isn’t the right chemistry tool (yet)',
                tocLabel: 'Honest limits',
                kicker: 'Honest limits',
                blocks: [
                    html(`
<ul class="cq-limits">
<li><strong>No structure editor.</strong> Structures are pictures: cropped from your paper by the import, or uploaded. You can’t draw a benzene ring inside the builder.</li>
<li><strong>Answers are numbers, not formulas or names.</strong> A student can type 10, but not H₂O or 2-methylbut-2-ene. Test formulas, names and structures with single- or multiple-correct questions.</li>
<li><strong>No long answers or step marking.</strong> Every question is marked automatically, so mechanisms, derivations, and Sections B to E of a board paper still belong on paper. Use online tests for what they do well: quick, frequent, objective practice.</li>
<li><strong>No 3D models or simulations.</strong> Shapes of molecules are tested with pictures and words, not by rotating a model.</li>
<li><strong>AI needs a human check.</strong> Clean print reads very well; faint photocopies and crowded handwriting less so, and charges are the first thing to go. Budget a few minutes to read each imported paper.</li>
<li><strong>No printed paper from the test.</strong> TestoZa runs tests on screens. If you also need a paper copy, our free <a href="https://pdf.testoza.com/latex-to-pdf">LaTeX to PDF</a> tool turns LaTeX, mhchem included, into a printable PDF.</li>
</ul>
`),
                ],
            },
        ],
        faqs: [
            {
                q: 'Can I type chemical formulas in Google Forms?',
                a: 'Only by pasting special characters: Google Forms has no subscript or superscript formatting, so teachers copy characters such as ₂ and ³⁺ one at a time. That works for H₂O, but not for an arrow with a catalyst on it, a stacked isotope or an equilibrium constant written as a fraction. A chemistry question paper maker like TestoZa writes formulas in mhchem and draws them as sharp text.',
            },
            {
                q: 'Do I need to know LaTeX or mhchem to make a chemistry test?',
                a: 'No. You can upload an existing paper and let AI type the chemistry, fill a question from a photo, or use the Sy Pad: tap Formula, type H2SO4 in plain letters, and the 2 and 4 drop below the line. mhchem is optional; if you know it, typing \\ce{} between dollar signs is the fastest way.',
            },
            {
                q: 'How do I write a reaction with a catalyst or heat on the arrow?',
                a: 'On the Sy Pad’s Chemistry tab, use the arrow key with boxes above and below and fill in MnO₂, Δ or a temperature. In mhchem, put the conditions in square brackets after the arrow, above first and then below: \\ce{2KClO3 ->[MnO2][\\Delta] 2KCl + 3O2}.',
            },
            {
                q: 'Can I add organic structures to questions and options?',
                a: 'Yes, as pictures. The AI import crops structures from your paper and attaches them to the right questions, or to the right options when the options are drawings. You can also upload an image to any question or option. There is no tool for drawing structures inside the builder; a free editor such as PubChem Sketcher works well for clean drawings.',
            },
            {
                q: 'Can AI read handwritten chemistry?',
                a: 'Yes, within reason. Fill from a photo reads a printed or handwritten question and types the question and options with formulas in mhchem; the AI import reads PDFs and photos of whole papers. Clear handwriting works well. Charges and capital letters are the first things to go wrong, so read the result once before students see it.',
            },
            {
                q: 'Can students answer with a chemical formula?',
                a: 'No. In a numerical question students type a number on an on-screen keypad (digits, one decimal point and a minus sign). Test formulas, names and structures as single-correct or multiple-correct questions, and ask numerical answers in a stated unit or power, such as “in units of 10⁻⁵ mol L⁻¹”.',
            },
            {
                q: 'How do I set a fair answer for a pH question?',
                a: 'Give the log values and the decimal places in the question, then choose “A range of values” from the truncated to the rounded answer. For the pH of 0.002 M HCl (2.699…, so 2.70), a range of 2.69 to 2.70 accepts careful answers and rejects 2.71. Answers are compared as numbers, so 2.7 and 2.70 count the same.',
            },
            {
                q: 'Can I make a NEET-style chemistry test with negative marking?',
                a: 'Yes. Set +4 and −1, make every question single correct, and give about a minute a question, as NEET does. Our NEET online test software guide covers full NEET mocks with Physics, Chemistry and Biology sections.',
            },
            {
                q: 'Can I set assertion–reason and match-the-column questions?',
                a: 'Yes, both as single-correct questions. Assertion–reason questions use the four standard statements as options. For match-the-column, put List-I and List-II in a table in the question (the Sy Pad’s Tables tab has a Match List layout, and the AI import turns printed lists into tables) and the four codings as options.',
            },
            {
                q: 'Will formulas show properly on a cheap Android phone?',
                a: 'Yes. TestoZa draws chemistry as text with KaTeX and mhchem, so subscripts and charges are sharp on any screen, grow when the student increases the text size, and load quickly on a slow connection. A long reaction scrolls sideways inside the question instead of breaking the page.',
            },
            {
                q: 'Is the chemistry question paper maker free?',
                a: 'TestoZa has a free plan for individual teachers, which covers making chemistry tests and sharing them with students. Paid plans, from ₹49 a week, add institute branding, exam-security rules, detailed analytics and more result submissions.',
            },
            {
                q: 'Can I make a chemistry test in Hindi?',
                a: 'Yes. Question boxes have a हिंदी switch for typing Hindi with English letters, and formulas work the same inside Hindi text. Our Hindi online test maker guide shows the details.',
            },
        ],
        closingTitle: 'Put one real chemistry paper online this week',
        closing: [
            html(`
<p>Don’t start with a whole question bank. Take next week’s chapter test, the paper you would have photocopied anyway, and put it online: import it, read it once with an eye on the charges, fix what needs fixing with the Sy Pad, and send the link. One test will tell you more than this guide can.</p>
<div class="cq-paths">
<a class="cq-path" href="/generate-with-ai" data-icon="doc"><span class="cq-path-who">Have a paper already?</span><span class="cq-path-what">Upload the PDF or photos</span></a>
<a class="cq-path" href="/create-test" data-icon="pencil"><span class="cq-path-who">Writing new questions?</span><span class="cq-path-what">Open the builder and the Sy Pad</span></a>
<a class="cq-path" href="/how-to-conduct-online-exam" data-icon="key"><span class="cq-path-who">Running it at a fixed time?</span><span class="cq-path-what">Set up a sitting with a join code</span></a>
</div>
<p>Related reading: <a href="/neet-online-test-software">NEET online test software</a>, <a href="/jee-mock-test-platform">a JEE mock test platform</a>, <a href="/math-test-maker">a math test maker with equations</a>, <a href="/hindi-online-test-maker">a Hindi online test maker</a> and <a href="/prevent-cheating-in-online-exams">how to prevent cheating in online exams</a>.</p>
`),
        ],
        sources: [
            {
                label: 'Exam patterns',
                links: [
                    { label: 'Chemistry (043) sample question paper, Class XII, 2026-27 (CBSE)', href: 'https://cbseacademic.nic.in/web_material/SQP/ClassXII_2026_27/Chemistry-SQP.pdf' },
                    { label: 'CUET (UG) 2026 Information Bulletin (NTA)', href: 'https://cdnbbsr.s3waas.gov.in/s3d1a21da7bca4abff8b0b61b87597de73/uploads/2026/01/202601031633478370.pdf' },
                    { label: 'NEET (UG) (NTA)', href: 'https://neet.nta.nic.in/' },
                    { label: 'Optional Section B removed from NEET UG, 2025 (Careers360)', href: 'https://news.careers360.com/neet-ug-2025-nta-removes-optional-question-in-section-b-revised-exam-pattern-apaar-id-exam-date-latest-news' },
                    { label: 'JEE Main (NTA)', href: 'https://jeemain.nta.nic.in/' },
                ],
            },
            {
                label: 'Google Forms and Microsoft Forms',
                links: [
                    { label: 'Adding superscripts and subscripts to Google Forms (Flipped Around Physics)', href: 'https://www.flippedaroundphysics.com/blog/adding-superscripts-and-subscripts-to-google-forms' },
                    { label: 'How to type subscript and superscript in Microsoft Forms (Microsoft Q&A)', href: 'https://learn.microsoft.com/en-us/answers/questions/5005570/how-to-type-subscript-and-superscript-in-microsoft' },
                    { label: 'Create a math quiz in Microsoft Forms (Microsoft Support)', href: 'https://support.microsoft.com/en-us/topic/create-a-math-quiz-in-microsoft-forms-24965e20-47f5-4a96-b853-c49dab873fb6' },
                    { label: 'Negative score for wrong answers in Microsoft Forms (Microsoft Q&A)', href: 'https://learn.microsoft.com/en-us/answers/questions/112377/negative-score-for-wrong-answer-in-test-exam-using' },
                    { label: 'A range of numbers as a quiz answer in Microsoft Forms (Microsoft Q&A)', href: 'https://learn.microsoft.com/en-us/answers/questions/5061145/microsoft-forms-quiz-with-correct-answers-the-answ' },
                    { label: 'Set up quiz grading options (Google Forms API)', href: 'https://developers.google.com/workspace/forms/api/guides/setup-grading' },
                ],
            },
            {
                label: 'Chemistry on the web',
                links: [
                    { label: 'mhchem manual', href: 'https://mhchem.github.io/MathJax-mhchem/' },
                    { label: 'KaTeX’s mhchem extension', href: 'https://github.com/KaTeX/KaTeX/tree/main/contrib/mhchem' },
                    { label: 'PubChem Sketcher (National Library of Medicine)', href: 'https://pubchem.ncbi.nlm.nih.gov/edit3/index.html' },
                ],
            },
        ],
    },
};
