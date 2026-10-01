/**
 * testoza.com/ai-test-generator — what an AI test generator does, Extract vs
 * Generate, the settings, the review step, and how teachers, institutes and
 * students use TestoZa's.
 *
 * Every product claim here was checked against the code on 2026-10-01:
 *   - Upload, settings, modes: src/pages/AITestImporter.tsx (drag and drop, several
 *     files, client-side image compression, optional answer key, Same as material /
 *     English / Hindi / both, Easy / Moderate / Tough (default Tough, generate only),
 *     custom instructions, High Accuracy (stateful, default) vs Fast Mode (parallel))
 *   - File types: backend/app/routers/ai.py accepts .pdf .png .jpg .jpeg .webp only.
 *     The picker also offers Word/PowerPoint, which the backend rejects, so this
 *     guide says "save as PDF first". Login required; 30 runs per user per hour
 *     (app/utils/rate_limiter.py ai_heavy_per_user); a stream is capped at 600 s.
 *   - Pipeline: backend/ai_preview_importer (hybrid_pipeline.py: native PDF text,
 *     scanned pages rendered for vision; quality_analyzer.py: 150/200/300 DPI;
 *     pdf_vision_pipeline.py prompts: Extract never guesses answers, keeps digits,
 *     joins cross-page questions, passages with groupId, match-the-following as
 *     arrays, solution diagrams skipped, diagram_bbox crops; Generate aims for
 *     15–25 questions, misconception distractors, title/description/revision notes)
 *   - Live screen and review: src/components/ai-import/ProcessingView.tsx and
 *     PreviewView.tsx (stages, tab title, Needs answer / Diagrams filters, search,
 *     jump grid, Raw, Generate more, Edit, Save & continue)
 *   - Saving: handleDirectSave in AITestImporter.tsx (is_public false, duration =
 *     question count, a missing answer is stored as "A")
 *   - Fill from photo: backend /ai/read-question (printed or handwritten, answer only
 *     when marked, diagram cropped)
 *   - Students: login_required is optional (TestIntroPage.tsx); results show time per
 *     question and an AI chat (ResultsPage.tsx); AI generation is on the free plan
 *     (PricingPage.tsx).
 */
import { AI_TEST_GENERATOR_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

export const AI_TEST_GENERATOR: Guide = {
    meta: AI_TEST_GENERATOR_META,
    body: {
        intro: [
            html(`
<p>Ask a teacher what slows down testing and the answer is rarely the questions. It's the typing. The paper already exists as a PDF, a photocopy or a page in the textbook, and someone still has to type forty questions, four options each, an answer key and a few formulas into whatever the students will use. That's an evening gone for one test.</p>
<p>An AI test generator removes that step. You give it the material you already have and it hands back a test you can check, edit and share: the questions, the options, the answer key, even the diagrams, cut out of the page and attached to the right question. This guide explains how that works, what the AI does well, what you still have to check, and how teachers, coaching institutes and students use the generator built into <a href="/">TestoZa</a>.</p>
`),
        ],

        answer:
            'An AI test generator reads material you already have, such as a PDF, a scanned question paper or photos of textbook pages, and turns it into an online test: questions, options, an answer key and diagrams, ready to edit and share. Good ones do two separate jobs: extract an existing paper exactly as written, or generate new questions from study material at the language and difficulty you choose. TestoZa does both for free in the browser, shows every question live as it is read, flags any question it could not find an answer for, and lets you set marks, negative marking and a time limit before you share a single link.',

        sections: [
            {
                id: 'what-it-does',
                title: 'What an AI test generator actually does',
                tocLabel: 'What it does',
                kicker: 'The basics',
                blocks: [
                    html(`
<p>An AI test generator reads a document the way a person does (page layout, question numbers, options, tables, figures) and writes what it finds into a structured test rather than a block of text. That second part matters more than it sounds. A question isn't just a sentence. It has a type (single correct, multiple correct or numerical), options in a fixed order, a correct answer, marks, perhaps a passage it belongs to or a figure it can't be answered without. A generator that understands this produces something you can run as an exam, not something you have to reformat.</p>
<p>It helps to be clear about what it isn't:</p>
<ul class="atg-list">
<li><b>Not a chatbot conversation.</b> Ask a general chatbot for "20 MCQs on Newton's laws" and you get 20 MCQs as text. Then you copy them somewhere, fix the formatting, retype the maths, build the answer key and set the timer yourself. A test generator ends with a test.</li>
<li><b>Not a fixed question bank.</b> A question bank is written once and shared by everyone. A generator works from <em>your</em> material, so the test matches what you taught this week, in the order and at the depth you taught it.</li>
<li><b>Not autopilot.</b> The AI drafts and you approve. A good tool shows you what it wasn't sure about instead of hiding it.</li>
</ul>
<div class="atg-table"><table>
<thead><tr><th scope="col"></th><th scope="col">Chatbot, then copy and paste</th><th scope="col">AI test generator</th></tr></thead>
<tbody>
<tr><th scope="row">Scanned papers and photos</th><td>One image at a time, if at all</td><td>Many pages at once, scanned or digital</td></tr>
<tr><th scope="row">An existing paper</th><td>Tends to reword it</td><td>Extract mode copies it word for word</td></tr>
<tr><th scope="row">Diagrams</th><td>Described in words</td><td>Cut from the page and attached</td></tr>
<tr><th scope="row">Answer key</th><td>Somewhere in the reply</td><td>Stored per question; missing ones flagged</td></tr>
<tr><th scope="row">Maths and chemistry</th><td>Plain text or raw code</td><td>Typeset on screen and editable</td></tr>
<tr><th scope="row">A timed, marked test</th><td>You build it elsewhere</td><td>Saved in one tap, shared as a link</td></tr>
</tbody>
</table></div>
<p>On TestoZa the generator lives at <a href="/generate-with-ai">testoza.com/generate-with-ai</a>. It takes PDFs and photos (PNG, JPG or WEBP), several at once, plus an optional answer key, and it produces a test in exactly the same format as one you'd build by hand. So everything else on the platform works on it: timers, negative marking, sections, live exam links and results.</p>
`),
                    {
                        type: 'widget',
                        widget: 'material-picker',
                        fallbackHtml: `<h3>What do you have? Which mode to use</h3>
<ul>
<li><strong>An old question paper or a DPP (PDF or scan):</strong> Extract. Upload its answer key too.</li>
<li><strong>A textbook chapter or class notes:</strong> Generate new questions from it.</li>
<li><strong>Photos of book pages:</strong> Generate, or Extract if the pages are exercise questions you want kept as they are.</li>
<li><strong>One question on paper, printed or handwritten:</strong> Fill from photo in the test builder.</li>
<li><strong>A YouTube lecture:</strong> YouTube to quiz.</li>
<li><strong>A Word or PowerPoint file:</strong> save it as a PDF, then Extract or Generate.</li>
</ul>`,
                    },
                ],
            },
            {
                id: 'extract-or-generate',
                title: 'Extract or Generate: two different jobs',
                tocLabel: 'Extract vs Generate',
                kicker: 'Two modes',
                blocks: [
                    html(`
<p>Every run starts with one decision, and it's the one most people get wrong the first time. After you add a file, TestoZa asks <em>How do you want to process this file?</em> and offers two cards.</p>
<h3>Extract Questions: keep the paper exactly as it is</h3>
<p>Use Extract when the questions already exist: last year's board paper, a DPP sheet, a chapter-end exercise, a coaching module, a worksheet you typed years ago. The AI copies each question, its options and its diagrams as they appear, keeps every digit (64.97 g stays 64.97 g, not 97 g), joins a question that runs over two pages, and keeps a comprehension passage together with the questions under it.</p>
<p>The answer key comes from the document itself: a key at the end of the paper, answers marked on the page, or a separate answer-key file you upload alongside. If no answer can be found for a question, Extract leaves it empty and flags it. It never solves the question to fill the gap, because a confident wrong answer in a key does more damage than an empty one.</p>
<h3>Generate New Questions: write fresh ones from study material</h3>
<p>Use Generate when you have content but no questions: a textbook chapter, class notes, a revision sheet, a few photographed pages. The AI works out the concepts, formulas and facts in the material and writes original questions that cover them in proportion, usually 15 to 25 per run depending on how much the pages contain. It can mix single-correct, multiple-correct and numerical questions, and it writes the answer key as it goes.</p>
<p>The wrong options are written to match real misconceptions: the student who forgets to divide by time, the one who confuses mass with weight. That's deliberate. Item-writing research has long treated plausible distractors as the thing that makes a multiple-choice question worth answering (Haladyna, Downing and Rodriguez, 2002). Generate also writes a title, a short description and a page of revision notes that students can open before they start.</p>
<p>Need more than one run gives you? Ask for a number in the custom instructions, or press <strong>Generate more</strong> on the review screen and the AI reads the material again for new questions.</p>
`),
                    {
                        type: 'widget',
                        widget: 'mode-compare',
                        fallbackHtml: `<h3>The same chapter, two modes</h3>
<p><strong>Extract</strong> on a question paper: "Q7. A force of 10 N acts on a body of mass 2 kg. The acceleration produced is (a) 20 m/s² (b) 5 m/s² (c) 12 m/s² (d) 0.2 m/s²", with "7. (b)" in the answer key, becomes question 7 with the same wording and options and B set as the answer. A question the key doesn't cover is flagged "No correct answer detected".</p>
<p><strong>Generate</strong> on a textbook paragraph about Newton's second law (F = ma, 1 N gives 1 kg an acceleration of 1 m/s²) produces new questions, for example: "A trolley of mass 4 kg speeds up from 2 m/s to 8 m/s in 3 s. What net force acts on it?" with options 2 N, 8 N (correct), 6 N and 32 N, a numerical question ("A net force of 15 N gives a body an acceleration of 3 m/s². What is its mass in kg?", answer 5) and a multiple-correct question on the definition of the newton.</p>`,
                    },
                    html(`
<p>A rule of thumb that works: if you'd be annoyed to see a question reworded, use Extract. If you'd be glad to see questions you've never seen before, use Generate.</p>
`),
                ],
            },
            {
                id: 'how-it-works',
                title: 'How it works, from upload to a shareable test',
                tocLabel: 'How it works',
                kicker: 'Step by step',
                blocks: [
                    html(`
<ol class="atg-steps">
<li><b>Upload.</b> Open the <a href="/generate-with-ai">AI test generator</a> and choose a file, or drag it onto the upload card. PDFs and photos both work, and you can select several photos at once for a multi-page chapter. Photos are compressed on your device before they upload, so it's quick even on mobile data. Have the answers on a separate sheet? Add it under <em>Answer Key (Optional)</em>. Working from Word or PowerPoint? Save it as a PDF first (File, then Save As, then PDF). It takes seconds and keeps the layout and diagrams intact.</li>
<li><b>Set the output.</b> Pick the language (the same as the material, English, Hindi or both), the difficulty for generated questions, and add any instructions in plain words. The defaults are sensible, so you can skip this.</li>
<li><b>Choose Extract or Generate.</b> One tap starts the run.</li>
<li><b>Watch it work.</b> A live screen shows real progress in four stages (Upload, Read pages, Find or Write questions, Final touches), a percentage, the time so far and an estimate of what's left. Questions appear underneath as they're read, so you can start checking question 1 while the AI is still on page 9. You can switch to another tab: the tab's title keeps showing the progress.</li>
<li><b>Review.</b> When the run finishes you get a summary (how many questions, how many still need an answer, which types, how long it took) and every question as a card, with filters for <em>Needs answer</em> and <em>Diagrams</em>, a search box and a grid to jump to any question.</li>
<li><b>Save or edit.</b> <em>Save &amp; continue</em> saves the test to My Tests, private until you decide otherwise. <em>Edit</em> opens it in the full test builder first, where you can change anything: wording, options, answers, marks, negative marks, sections and the time limit.</li>
<li><b>Share.</b> Copy the test's link for your class, or start a live exam with its own link. Students open it in any browser, and every submission is marked automatically.</li>
</ol>
<h3>What happens under the hood</h3>
<p>A short tour of the pipeline, because it explains both the speed and the limits:</p>
<ul class="atg-list">
<li><b>Digital PDFs are read directly.</b> If a page has a real text layer, as most PDFs exported from a computer do, that text is used as it is. That's fast, and it's why a clean PDF finishes well before a stack of phone photos.</li>
<li><b>Scanned pages are looked at, not just OCR'd.</b> Pages without text are turned into images and read by a vision model that understands layout: two-column papers, options in a grid, a figure between the question and its options. A quick quality check sets the resolution, so a faint photocopy is read at up to 300 DPI and a crisp scan at 150.</li>
<li><b>Pages are read in order.</b> In the default <em>High Accuracy</em> mode the document is read a few pages at a time, in sequence, so a question that starts at the bottom of page 4 and finishes on page 5 comes out whole. <em>Fast Mode</em> reads batches of pages side by side and finishes long files sooner.</li>
<li><b>Diagrams are cut from the page.</b> The AI marks where each figure sits, and that region is cropped from the page and attached to its question. Figures inside worked solutions are skipped, so the sketch under "Sol." doesn't end up in the question.</li>
<li><b>Maths and chemistry are written as LaTeX.</b> Chemical equations use mhchem notation. Fractions, roots, integrals, subscripts and reaction arrows are typeset properly and stay editable.</li>
</ul>
`),
                ],
            },
            {
                id: 'settings',
                title: 'The settings that change the questions',
                tocLabel: 'Settings',
                kicker: 'Settings',
                blocks: [
                    html(`
<p>Three settings sit above the two mode cards, and a fourth hides in the file card's header. None is required, but each makes a visible difference. Try the first two on the sample below: it's the same chapter and the same question slot, and the output changes the way the real generator's does.</p>
`),
                    {
                        type: 'widget',
                        widget: 'settings-lab',
                        fallbackHtml: `<h3>One topic, three difficulty levels</h3>
<p><strong>Easy:</strong> "What is the SI unit of force?" (Joule, Newton, Watt, Pascal; answer Newton).</p>
<p><strong>Moderate:</strong> "A trolley of mass 4 kg speeds up from 2 m/s to 8 m/s in 3 s. What net force acts on it?" (2 N, 8 N, 6 N, 32 N; answer 8 N).</p>
<p><strong>Tough:</strong> "Two blocks of 2 kg and 3 kg lie in contact on a smooth floor. A 20 N horizontal force pushes the 2 kg block. What force does the 2 kg block exert on the 3 kg block?" (20 N, 8 N, 12 N, 4 N; answer 12 N).</p>
<p>With English and Hindi both selected, each question and option appears in English with the Hindi beneath it, for example "What is the SI unit of force? / बल का SI मात्रक क्या है?"</p>`,
                    },
                    html(`
<h3>Language output</h3>
<p><em>Same as Material</em> keeps the language of your document. <em>English</em> or <em>Hindi</em> produces the whole test in that language whatever the source is written in, so an English textbook can become a Hindi-medium test. Select both and the test becomes bilingual: every question and every option is written in English with the Hindi directly beneath it, so one paper serves both mediums in the same classroom.</p>
<h3>Target difficulty</h3>
<p>This applies to generated questions. <em>Easy</em> means direct concept checks and one-step calculations. <em>Moderate</em> means standard application questions that take a few steps. <em>Tough</em>, the default, means deeper reasoning, multi-step problems and distractors that catch a half-understood idea. Extract ignores it, because an existing paper is as hard as it is.</p>
<h3>Custom instructions</h3>
<p>A free-text box the AI is told to follow strictly. It's where you set the things only you know:</p>
<ul class="atg-quotes">
<li>Each question 4 marks, −1 for a wrong answer.</li>
<li>Generate 30 questions, at least 8 of them numerical.</li>
<li>Only from section 9.3, Newton's second law.</li>
<li>Split the paper into Physics and Chemistry sections.</li>
<li>Ignore the solved examples; use the exercise questions only.</li>
</ul>
<h3>High Accuracy or Fast Mode</h3>
<p>A small menu in the header of the file card. <em>High Accuracy</em>, the default, reads page by page and keeps the order of the paper; use it for exam papers and anything with questions that run across pages. <em>Fast Mode</em> splits the pages into chunks and reads them in parallel; use it for long, simple material when speed matters more than sequence.</p>
`),
                ],
            },
            {
                id: 'what-it-reads',
                title: 'What it can read: maths, chemistry, diagrams, passages and Hindi',
                tocLabel: 'What it reads',
                kicker: 'Coverage',
                blocks: [
                    html(`
<p>School and entrance papers are not plain text, and a generator that only copes with plain text isn't much use beyond primary classes. Here's what TestoZa's handles, and the shape each thing takes in your test:</p>
<div class="atg-table"><table>
<thead><tr><th scope="col">In your paper</th><th scope="col">In the test</th></tr></thead>
<tbody>
<tr><td>Single-correct MCQs, options labelled (a)–(d), (1)–(4) or A–D</td><td>Single choice, options A–D</td></tr>
<tr><td>"One or more options may be correct"</td><td>Multiple correct, every right option in the key</td></tr>
<tr><td>Integer and numerical-value questions</td><td>Numerical, the answer stored as a value or a range</td></tr>
<tr><td>Comprehension and case-based passages</td><td>The passage kept with each question under it</td></tr>
<tr><td>Match the following, tables, matrices</td><td>A typeset table inside the question</td></tr>
<tr><td>Fractions, roots, powers, integrals, vectors</td><td>LaTeX, typeset on screen</td></tr>
<tr><td>Chemical formulas and equations: H₂SO₄, ⇌, ↑, ↓</td><td>mhchem, typeset on screen</td></tr>
<tr><td>Graphs, circuits, ray diagrams, structures</td><td>Cropped from the page, attached as an image</td></tr>
<tr><td>Hindi (Devanagari) text</td><td>Kept in Hindi, or translated if you choose</td></tr>
</tbody>
</table></div>
<p>Two notes from experience. First, handwriting. The document generator does its best work on printed and typed pages; neat handwriting usually reads, untidy notes may not. For a single handwritten question there's a better tool: <strong>Fill from photo</strong> in the <a href="/create-test">test builder</a>. Photograph one question, printed or handwritten, even at an angle on lined paper, and it fills that question's text, type, options and diagram. It takes the answer only if one is ticked or written in the photo, and never works it out on its own.</p>
<p>Second, quality in, quality out. A straight, well-lit photo of a page reads better than a shadowy one taken at an angle, and a PDF exported from a computer reads better than a photo of a printout of that same PDF. If a page comes out badly, retaking the photo is quicker than fixing the result.</p>
`),
                ],
            },
            {
                id: 'review',
                title: 'Review before you share: the two-minute check',
                tocLabel: 'Review',
                kicker: 'Quality',
                blocks: [
                    html(`
<p>The AI is fast and usually right. "Usually" is why this section exists. The review screen is built so that checking a 30-question draft takes a couple of minutes rather than a slow read of the whole paper. Try it below: it's a working replica of the real screen, with the same filters.</p>
`),
                    {
                        type: 'widget',
                        widget: 'review-screen',
                        fallbackHtml: `<h3>The review screen</h3>
<p>After a run, the review screen shows the number of questions, how many still need an answer, the question types and the processing time. Filters show all questions, only those that need an answer, or only those with diagrams. Every question appears as a card with its type, page and diagram; the correct option is marked green, and a Raw switch shows the text and LaTeX behind it. A jump grid marks the questions that need an answer in orange.</p>`,
                    },
                    html(`
<ol class="atg-steps">
<li><b>Clear the orange.</b> A question without a correct answer gets an orange number, and a banner counts them. Tap <em>Needs answer</em> to see only those, then set their answers in the editor before you share. A question saved without one gets a placeholder answer (option A), which will mark some students wrong.</li>
<li><b>Check numericals.</b> For integer and numerical-value questions, decide whether the answer should be an exact value or a range. A range of 2.4 to 2.6 accepts answers rounded in different ways.</li>
<li><b>Open the Diagrams filter.</b> Make sure each figure sits with the right question and isn't cut short. Tap a figure to enlarge it.</li>
<li><b>Spot-check generated answers.</b> In Generate mode the AI also writes the key. Check a few, especially calculations. It's the one place a generated question can be confidently wrong.</li>
<li><b>Use Raw when something looks odd.</b> The Raw switch on each card shows the text and LaTeX behind it, so a missing bracket or a stray symbol is easy to spot and fix in the editor.</li>
<li><b>Set the marks and the time.</b> A saved test starts at one minute per question. Change the duration, marks and negative marks in the editor if your custom instructions didn't already.</li>
</ol>
<p>That's the whole job. It's still checking, but checking a draft is a very different job from typing a paper, and it's the step that makes a test made with AI as trustworthy as one you typed yourself.</p>
`),
                ],
            },
            {
                id: 'teachers',
                title: 'For teachers: a week of class tests in one sitting',
                tocLabel: 'Teachers',
                kicker: 'Teachers',
                blocks: [
                    html(`
<p>Teachers who keep using an AI test generator tend to settle into a few routines. These are the ones we see most often:</p>
<div class="atg-cards">
<article class="atg-card"><h3>The chapter test</h3><p>Upload the chapter PDF or photos of its pages. Generate, Moderate, "15 questions, 1 mark each". Ten minutes including the review, then the link goes to the class group.</p></article>
<article class="atg-card"><h3>Last year's paper, online</h3><p>Upload the paper with its answer key and choose Extract. Same questions, same diagrams, now marked automatically, with time taken on every question.</p></article>
<article class="atg-card"><h3>The bilingual paper</h3><p>Hindi-medium and English-medium students in one room? Select English and Hindi. Every question and option appears in both, so nobody waits for a translation.</p></article>
<article class="atg-card"><h3>The second chance</h3><p>After a test, generate a fresh set on the topic most of the class got wrong, at Easy, so the retry rebuilds confidence before the next step up.</p></article>
</div>
<p>Mix and match freely. Generate 20 questions, delete the five you don't like, and type two of your own in the builder. Once saved, the test is an ordinary TestoZa test: add a passage, change the marks on one question, or write a formula with the Sy Pad keyboard instead of LaTeX. When students submit, they see their score, the correct answers and the time they spent on each question, and you see a rank list and how the class did on every question.</p>
<p>The building side is covered step by step in <a href="/create-mock-test-online">how to create a mock test online</a>.</p>
`),
                ],
            },
            {
                id: 'institutes',
                title: 'For coaching institutes: a test series from material you already own',
                tocLabel: 'Institutes',
                kicker: 'Coaching institutes',
                blocks: [
                    html(`
<p>Institutes rarely lack questions. They have years of DPPs, modules and in-house papers, usually as PDFs on a shared drive. The bottleneck is turning them into online tests fast enough to run a weekly series without a data-entry team. Extract mode is made for exactly that.</p>
<ul class="atg-list">
<li><b>Convert the archive.</b> Run each DPP or module PDF through Extract with its answer key. Questions, diagrams and passages come across as they are, and the review screen tells you which ones still lack an answer.</li>
<li><b>Build exam-pattern papers.</b> Ask for sections and marking in the instructions ("Physics, Chemistry and Mathematics sections; +4, −1"), then fine-tune in the editor: numerical sections, "attempt any 5 of 10" rules, a three-hour timer.</li>
<li><b>Run it as a live exam.</b> Any test can become a live exam with its own link that only your students have. Paid plans add the exam rules (full screen, tab-switch limits, no copy and paste), scheduling, a start form and your institute's name and logo.</li>
<li><b>Read the batch.</b> Results arrive as students submit: a rank list, accuracy on every question, and how the batch split across the options, which shows faculty which wrong idea is the common one.</li>
</ul>
<p>One policy point worth writing down for your staff: upload material you have the right to use, such as your own papers, your own notes and publicly released past papers. The generator makes conversion easy. It doesn't change who owns the content.</p>
<p>The exam-day side is covered in depth in <a href="/cbt-exam-software">CBT exam software</a>, and JEE papers, with their integrals and reaction arrows, in <a href="/jee-mock-test-platform">JEE mock test platform</a>.</p>
`),
                ],
            },
            {
                id: 'students',
                title: "For students: turn today's chapter into tonight's test",
                tocLabel: 'Students',
                kicker: 'Students',
                blocks: [
                    html(`
<p>You don't need a teacher to use an AI test generator, and for self-study it may be the most useful thing on the platform. Rereading a chapter feels productive but does little for recall. Testing yourself on it does a lot. In a well-known experiment, students who took a practice test on a passage remembered more of it a week later than students who spent the time rereading it (Roediger and Karpicke, 2006). A large review of study techniques rated practice testing as one of only two methods of high usefulness (Dunlosky and colleagues, 2013).</p>
<p>The problem has always been getting the questions. Now it goes like this:</p>
<ol class="atg-steps">
<li><b>Capture what you studied.</b> Photograph the pages, or upload the chapter PDF.</li>
<li><b>Choose Generate.</b> Pick Moderate the first time and Tough when you're ready.</li>
<li><b>Take it properly.</b> Save, open the test and sit it with the timer running, as you would on exam day.</li>
<li><b>Learn from the result.</b> See what you got wrong and how long each question took, and ask the AI chat on the results page to explain a mistake. Retake the test a few days later.</li>
</ol>
<p>It works the same for boards, JEE, NEET, CUET, state exams or a college semester. You'll need a free account to use the AI; that's how we keep the service fast for everyone.</p>
`),
                ],
            },
            {
                id: 'time-saved',
                title: 'How much time does it actually save?',
                tocLabel: 'Time saved',
                kicker: 'The arithmetic',
                blocks: [
                    html(`
<p>It depends on the paper, so here's a calculator instead of a headline number. Typing an MCQ by hand (the question, four options, the answer and any formula) takes most teachers two to four minutes, and maths or chemistry takes longer. With the generator your time goes into review instead: around half a minute a question, plus a couple of minutes while the AI runs, which you can spend on something else.</p>
`),
                    {
                        type: 'widget',
                        widget: 'time-saved',
                        fallbackHtml:
                            '<p>Example: 60 questions a week at 3 minutes each by hand is 3 hours. With the generator, at about 30 seconds of review per question plus 2 minutes of processing per 20-question paper, it is about 36 minutes: roughly 2 hours 24 minutes saved every week, or over 10 hours a month.</p>',
                    },
                    html(`
<p>Plug in your own numbers. For anyone who makes more than a couple of tests a week, the saving is counted in hours, not minutes.</p>
`),
                ],
            },
            {
                id: 'choosing',
                title: 'How to judge any AI test generator, including ours',
                tocLabel: 'Choosing one',
                kicker: 'Checklist',
                blocks: [
                    html(`
<p>There are a lot of AI quiz tools now, and their demos look much alike. These questions separate them quickly. Give each tool the same awkward document, a scanned two-column paper with a few diagrams and a formula or two, and see which answers hold up.</p>
<ol class="atg-steps atg-steps--check">
<li><b>Does it read scans and photos, or only clean text?</b> Most real material in Indian classrooms is scanned or photographed.</li>
<li><b>Does it keep the wording when you want it kept?</b> Converting an existing paper needs exact extraction, not a paraphrase.</li>
<li><b>Are diagrams attached to the right question?</b> Or described in words, or quietly dropped?</li>
<li><b>Does the maths survive?</b> Fractions, powers, roots and chemical formulas should be typeset and editable, not flattened into "x2".</li>
<li><b>What happens when it doesn't know the answer?</b> It should leave it empty and tell you, not guess.</li>
<li><b>Can you edit everything afterwards?</b> Text, options, answers, marks, sections and time.</li>
<li><b>Does the result run as a real test?</b> A timer, negative marking, sections, a shareable link and automatic marking, on a phone.</li>
<li><b>Does it speak your students' language?</b> Hindi-medium and bilingual papers are normal, not an edge case.</li>
<li><b>What does it cost to use every week?</b> Check the free plan's limits, not just the headline price.</li>
</ol>
<p>We built TestoZa's generator to pass all nine. It's included on every plan, the free one too. Paid plans add exam controls and branding for institutes, not access to the AI. Current prices are on the <a href="/pricing">pricing page</a>, and if you're comparing whole platforms rather than generators, read <a href="/best-online-test-platform">how to choose an online test platform</a>.</p>
`),
                ],
            },
            {
                id: 'limits',
                title: 'Honest limits',
                tocLabel: 'Limits',
                kicker: 'Before you start',
                blocks: [
                    html(`
<p>No tool is right for everything. These are the edges worth knowing before you plan a term around it:</p>
<ul class="atg-list">
<li><b>PDFs and images only.</b> Word and PowerPoint files need saving as a PDF first.</li>
<li><b>It reads what it can see.</b> A blurry, dark or skewed photo produces mistakes or missed questions.</li>
<li><b>Very long documents.</b> A single run is capped at about ten minutes. Send a 300-page book in chapters, which makes better tests anyway.</li>
<li><b>Generated answers are written by the AI.</b> They're right far more often than not, but a test is only as good as its key. Spot-check before you share.</li>
<li><b>Extract never guesses.</b> If the answers aren't in the document, you'll set them yourself. The review screen counts them for you.</li>
<li><b>Handwriting in bulk.</b> Neat handwriting usually reads and messy notes may not. For one handwritten question, Fill from photo is the better tool.</li>
<li><b>Fair-use limits.</b> You need to be signed in, and each account can start up to 30 AI runs an hour. That's plenty for real use and stops one account slowing things down for everyone.</li>
<li><b>Languages.</b> The output can be in the material's own language, English, Hindi, or English and Hindi together. Other target languages aren't offered yet.</li>
</ul>
`),
                ],
            },
        ],

        faqs: [
            {
                q: "Is TestoZa's AI test generator free?",
                a: 'Yes. The AI test generator is included on the free plan with no credit card. You need a free account to use it, and there is a fair-use limit of 30 AI runs per hour per account. Paid weekly, monthly and yearly plans add institute features such as exam rules, scheduling, branding and Excel export.',
            },
            {
                q: 'What files can I upload?',
                a: 'PDF, PNG, JPG (or JPEG) and WEBP. You can upload several files or photos at once and add a separate answer key as a PDF or image. Save Word and PowerPoint files as PDF before uploading them.',
            },
            {
                q: 'Can I make a test from a photo of a textbook page?',
                a: 'Yes. Photograph the pages straight and in good light, upload the photos, and choose Generate to get new questions from the content, or Extract if the pages hold exercise questions you want kept exactly as they are.',
            },
            {
                q: 'Does it create the answer key too?',
                a: 'In Generate mode the AI writes the correct answer for every question it creates. In Extract mode it takes answers from the document: a key at the end, answers marked on the page, or an answer-key file you upload. Questions it cannot find an answer for are flagged so you can set them yourself.',
            },
            {
                q: 'Can it make questions in Hindi, or a bilingual paper?',
                a: 'Yes. Choose Hindi for a test entirely in Hindi, English for English, or both for a bilingual test in which every question and option appears in English with the Hindi beneath it. Same as Material keeps the language of your document.',
            },
            {
                q: 'How many questions does it generate?',
                a: 'A Generate run usually writes 15 to 25 questions, depending on how much the material covers. You can ask for a specific number in the custom instructions, and the Generate more button on the review screen adds further questions from the same material. Extract returns every question it finds.',
            },
            {
                q: 'Can it handle maths formulas, chemical equations and diagrams?',
                a: 'Yes. Maths is written in LaTeX and chemistry in mhchem notation, both typeset on screen and editable in the test builder. Diagrams, graphs and circuits are cropped from the page and attached to their question.',
            },
            {
                q: 'How long does it take?',
                a: 'Usually one to three minutes. Digital PDFs are quickest because their text is read directly; scanned pages and photos take longer. A live screen shows the progress, and questions appear as they are read.',
            },
            {
                q: 'Is AI-generated content accurate enough to use without checking?',
                a: 'It is accurate most of the time, but check it before you share it, especially answer keys for calculations and anything the review screen flags. The review screen is designed to make that a two-minute job.',
            },
            {
                q: 'Can I edit the questions after generating them?',
                a: 'Yes. Edit opens the draft in the full test builder, where you can change the wording, options, answers, marks, negative marks, sections and time limit, delete questions and add your own.',
            },
            {
                q: 'Will my test be public?',
                a: 'No. A test saved from the AI generator is private. Only you can see it until you share its link, start a live exam with it or choose to publish it.',
            },
            {
                q: 'Do my students need an account to take the test?',
                a: 'No, unless you turn on sign-in for that test. Students open the link in any phone or computer browser and start.',
            },
            {
                q: 'How is this different from asking ChatGPT for questions?',
                a: 'A chatbot gives you questions as text. A test generator reads your actual pages, including scans and diagrams, keeps an existing paper word for word when you want that, stores the answer for each question, flags the ones it could not find, and turns the result into a timed, automatically marked test with a link.',
            },
        ],

        closingTitle: 'Turn one chapter into a test today',
        closing: [
            html(`
<p>Start with whatever is on your desk right now:</p>
<div class="atg-paths">
<a class="atg-path" href="/generate-with-ai"><span class="atg-path-who">Have an old paper?</span><span class="atg-path-what">Extract it with its answer key</span></a>
<a class="atg-path" href="/generate-with-ai"><span class="atg-path-who">Have a chapter or notes?</span><span class="atg-path-what">Generate new questions from them</span></a>
<a class="atg-path" href="/create-test"><span class="atg-path-who">Have one question on paper?</span><span class="atg-path-what">Use Fill from photo in the builder</span></a>
</div>
<p>Related reading: <a href="/create-mock-test-online">how to create a mock test online</a>, <a href="/jee-mock-test-platform">JEE mock test platform</a>, <a href="/cbt-exam-software">CBT exam software</a>, <a href="/best-online-test-platform">how to choose an online test platform</a>, <a href="/youtube-to-quiz">YouTube to quiz</a> and <a href="/pricing">pricing</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Learning research',
                links: [
                    {
                        label: 'Roediger & Karpicke (2006), Test-enhanced learning, Psychological Science',
                        href: 'https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x',
                    },
                    {
                        label: 'Dunlosky et al. (2013), Improving students’ learning with effective learning techniques',
                        href: 'https://journals.sagepub.com/doi/10.1177/1529100612453266',
                    },
                    {
                        label: 'Haladyna, Downing & Rodriguez (2002), Multiple-choice item-writing guidelines (ERIC)',
                        href: 'https://eric.ed.gov/?id=EJ660246',
                    },
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
