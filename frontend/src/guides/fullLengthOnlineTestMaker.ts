/**
 * testoza.com/full-length-online-test-maker — what makes a mock "full-length", why it
 * teaches what chapter tests can't, the patterns of JEE Main, NEET, JEE Advanced, SSC CGL
 * Tier 1 and IBPS PO Prelims with the settings that copy them, building and running a
 * three-hour paper, reading the result and planning a series. Written for coaching
 * institutes and teachers running test series.
 *
 * Exam figures are taken from the checked guides (JEE, NEET, JEE Advanced, SSC, bank);
 * see their headers for sources. Product facts as in howtoData.ts, plus: combined tests
 * with a 0–180 minute break (30 by default), whole papers uploadable as a JSON file with
 * sections and solutions, a "no time limit" practice option. Limits stated plainly: no
 * normalisation, section locks enforced in the browser, the break between papers not
 * enforced, no merged faculty rank list across two papers, no typed descriptive answers.
 */
import { HOWTO_PAGES } from './howtoData';
import { compareFallback, patternsFallback, stepsFallback } from './howtoFallback';
import { FULL_LENGTH_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const P = HOWTO_PAGES.fullLength;

export const FULL_LENGTH_ONLINE_TEST_MAKER: Guide = {
    meta: FULL_LENGTH_META,
    body: {
        intro: [
            html(`
<p>Every test series ends in the same place: a Sunday morning, a full paper, the real duration, and a batch that will sit the actual exam a few weeks later. Chapter tests teach the syllabus. The full-length mock teaches the exam — the clock, the order, the stamina, the decision to leave a question blank.</p>
<p>It is also the test that online tools handle worst. A ten-question quiz survives almost any software. A 180-question, three-hour paper with sections, negative marking and a batch writing on phones finds every weakness: the timer that drifts, the form that loses answers when a tab closes, the palette that doesn’t exist, the result that arrives as a spreadsheet of raw responses.</p>
<p>This guide covers what “full-length” really has to mean, why it matters, the patterns of the papers most Indian institutes prepare for, how to build and run one in TestoZa, how to read the result, and how to plan a series around it. It ends with what TestoZa does not do, so you can plan around that too.</p>
`),
        ],

        answer:
            'A full-length online test copies the real exam in every way that changes how a candidate behaves: the same number of questions, the full duration on one clock (or the same sectional clocks), the same sections, the exam’s own marking scheme including negative and partial marks, the same question types and an exam-style screen with a question palette and Mark for review. The software also has to survive three hours of real life — saving answers continuously and letting a candidate carry on from another device — and produce section-wise results afterwards. In TestoZa you upload a previous paper as a PDF or photos (or build it), split it into sections, set Marks and Wrong once, set the clock or time each section, and run it as a live exam with a six-digit code. Building and running tests is free.',

        sections: [
            {
                id: 'what-it-is',
                title: 'What makes a mock test full-length',
                tocLabel: 'What full-length means',
                kicker: 'Start here',
                blocks: [
                    html(`
<p>“Full-length” is often used to mean “long”. It should mean <strong>the same as the real paper in every way that changes how a candidate behaves</strong>. There are six of those, and a mock that differs in any one of them is rehearsing a different exam:</p>
<ol class="al-list al-list--num">
<li><strong>Every question.</strong> All 180 for NEET, all 75 for JEE Main — not a 60-question “sample” scaled up. Fatigue is part of the exam, and it only shows up at question 140.</li>
<li><strong>The full duration, on the real kind of clock.</strong> One clock for the paper where the exam has one (JEE Main, NEET), and separate clocks that close each section where the exam has those (SSC CGL Tier 1, bank prelims).</li>
<li><strong>The exam’s sections.</strong> Physics, Chemistry and Mathematics as three tabs; Botany and Zoology as two sections, not one “Biology”. Candidates navigate by sections, and results are read by them.</li>
<li><strong>The exam’s marking.</strong> +4 and −1, +2 and −0.5, a quarter of the marks off, partial marks for multiple-correct questions — whatever the paper uses. Without negative marking, a mock rewards guessing, which the real exam punishes.</li>
<li><strong>The exam’s question types.</strong> Numerical answers typed on a keypad, not offered as four options. Multiple-correct questions as multiple-correct. Matching lists as matching lists.</li>
<li><strong>The exam’s screen.</strong> A question palette with its colours, Mark for review, Save &amp; Next. Candidates who have never used one lose minutes on the day finding their way around it.</li>
</ol>
<p>A seventh is worth adding where you can: <strong>the exam’s time of day.</strong> NEET has long been held in the afternoon; a candidate who has only ever written mocks at 9 a.m. has never practised being sharp at 4 p.m.</p>
`),
                ],
            },
            {
                id: 'why',
                title: 'What a full-length mock teaches that chapter tests can’t',
                tocLabel: 'Why it matters',
                kicker: 'Why bother',
                blocks: [
                    html(`
<p>Chapter tests are better for learning: they are short, they target a topic and they can be taken every week. But there are five things only a full paper can teach, and every one of them is worth marks.</p>
<h3>1. Where the minutes go</h3>
<p>NEET gives 180 questions in 180 minutes — an average of 60 seconds each — and nobody spends it evenly. A candidate who spends four minutes on one physics numerical has borrowed those minutes from twenty biology questions they would have answered in fifteen seconds each. JEE Main gives 75 questions in 180 minutes, about 2.4 minutes each, but candidates choose the order of three subjects on one clock. Only a full paper shows a student, in their own numbers, where their time actually went.</p>
<h3>2. Order and switching</h3>
<p>Biology first or Physics first? Mathematics last, when tired, or first, when fresh? There is no right answer, only the candidate’s answer, and a full mock is where they find it. Chapter tests never ask the question.</p>
<h3>3. Stamina</h3>
<p>Accuracy falls in the last hour of a three-hour paper, and it falls more for some students than others. That drop is invisible in a 30-minute test and obvious in a full one — question by question, if the software records the time spent on each.</p>
<h3>4. Attempt strategy under negative marking</h3>
<p>With +4 and −1, four wrong guesses cancel one right answer. Strong candidates learn when to leave a question blank: usually when they can’t rule out at least two options. That is a skill with real marks attached, and it is only learned under the real marking across a full paper, where the stakes add up.</p>
<h3>5. Sections that close</h3>
<p>In SSC CGL Tier 1, each of the four sections gets 15 minutes and closes when they run out — about 36 seconds a question, with no going back and no carrying time forward. Bank prelims do the same with 20-minute sections. A candidate who has only practised sections one at a time has never felt the wall at minute 15 arrive while they are in the middle of a question.</p>
<p class="al-note">A useful rule of thumb for a series: chapter tests every week, a part test every month, and full-length mocks every week or two in the last two months before the exam, at the exam’s time of day.</p>
`),
                ],
            },
            {
                id: 'patterns',
                title: 'The patterns, and the settings that copy them',
                tocLabel: 'Exam patterns',
                kicker: 'Exam by exam',
                blocks: [
                    html(`
<p>Pick an exam to see its pattern, the average pace it forces, and the TestoZa settings that reproduce it. The figures are from each exam’s own notices; where sources disagree, the card says so.</p>
`),
                    { type: 'widget', widget: 'hw-patterns', fallbackHtml: patternsFallback() },
                    html(`
<p>Two things are worth noticing across the five. First, the marking is never “one mark each”: even the simplest of them takes something off for a wrong answer, which is the single most important thing a mock has to copy. Second, the clock comes in two shapes — one clock for a whole paper, or a wall at the end of every section — and the shape changes strategy more than the duration does. Set the shape first and the minutes second.</p>
<p>Patterns change. JEE Advanced announces its paper in the instructions on the day; JEE Main dropped its optional numerical questions in 2025; SSC moved CGL and CHSL Tier 1 to sectional timing in 2026. Build your mocks so that marks live on sections, where one edit re-marks a whole block of questions, rather than retyping a scheme into every question.</p>
`),
                ],
            },
            {
                id: 'build',
                title: 'Building a full-length paper in TestoZa',
                tocLabel: 'Building one',
                kicker: 'Step by step',
                blocks: [
                    html(`
<p>The whole job, for a paper you already have as a PDF. Most of the time goes on reading it through, which no software can do for you:</p>
`),
                    { type: 'widget', widget: 'hw-steps', fallbackHtml: stepsFallback(P) },
                    html(`
<h3>Getting 75 or 180 questions in</h3>
<p>Typing a full paper by hand is a weekend. There are three faster routes:</p>
<ul class="al-list">
<li><strong>Upload the paper.</strong> The <a href="/ai-test-generator">AI test generator</a> reads a PDF or photos of printed pages — questions, options, the answer key, diagrams and equations — in Hindi, English or both. The review screen draws every formula, so checking a whole paper takes minutes rather than an evening, and you can fix anything in the editor afterwards.</li>
<li><strong>Upload a file.</strong> If your questions already live in a structured file, a whole paper with sections and solutions can be uploaded as JSON.</li>
<li><strong>Build it.</strong> The builder has a maths keyboard for integrals, vectors and chemical equations, and “Fill from a photo” for a single printed or handwritten question.</li>
</ul>
<h3>Sections</h3>
<p>Switch on <strong>Split into sections</strong> and name them as the exam does: Physics, Chemistry, Mathematics; or Physics, Chemistry, Botany, Zoology. The candidate’s screen shows them as tabs, the palette groups by them, and the result is reported section by section.</p>
<h3>Marks, set once</h3>
<p>Every question card has two numbers, <strong>Marks</strong> and <strong>Wrong</strong>. Set them on the first question and each new one copies them, so a 180-question paper is marked once. Where a block of questions marks differently — JEE Advanced’s numericals with no negative mark, say — set the marks on that section, and the most specific setting wins: question over section over test. Multiple-correct questions take <strong>Partial marks</strong>, either proportional or the JEE Advanced rule (+1 for each correct option chosen, −2 if any wrong option is). Numerical answers can be a single value or a range, for answers rounded to two decimals.</p>
<h3>The clock</h3>
<p>Set the paper’s total minutes. If the real exam closes sections on their own, switch on <strong>Time each section</strong> and give each its minutes: a section then closes when its time runs out and stays closed, and the candidate moves to the next. Leave the timer on for every mock that counts; the “no time limit” option is for practice at home.</p>
<h3>Two papers, one sitting</h3>
<p>For exams with two papers on one day, build each paper as its own test and choose <strong>Combine two papers</strong> on the dashboard: pick both and set a break of 0 to 180 minutes (30 unless you change it). Candidates write Paper 1, see the break, then Paper 2, and get one combined score at the end.</p>
<h3>Before it goes live</h3>
<p>Read the whole paper once, on a phone if that is what your batch will use, the way a candidate will see it. Check the answer key against your own copy — an AI import is good at reading keys, and a wrong key in a full mock damages 180 candidates’ results at once. Then switch the test to Conduct, or create a live exam for the batch.</p>
`),
                ],
            },
            {
                id: 'side-by-side',
                title: 'Google Forms and an exam platform, for a three-hour paper',
                tocLabel: 'Side by side',
                kicker: 'Side by side',
                blocks: [
                    html(`
<p>Many institutes start their online tests on Google Forms, and for short quizzes it is a good tool. A full-length mock asks five things of it that it was not built for:</p>
`),
                    { type: 'widget', widget: 'hw-compare', fallbackHtml: compareFallback(P) },
                ],
            },
            {
                id: 'exam-day',
                title: 'Running a three-hour paper for a batch',
                tocLabel: 'Exam day',
                kicker: 'Exam day',
                blocks: [
                    html(`
<p>A full-length mock is a rehearsal, so run it like the real day: same start time for everybody, a clean start, no extensions you would not get at a centre.</p>
<h3>Set it up as a live exam</h3>
<p>Create a live exam for the batch and you get a six-digit code, a QR code and a projector view. Set the start time — the real exam’s time of day, if you can — and how candidates check in: by name, by roll number, or by roll number and a PIN printed on a slip. With a batch list attached, only the names or roll numbers on it can join. Late entry is 15 minutes unless you change it, and a latecomer’s own three hours start when they start, as long as the exam is still open.</p>
<h3>The start</h3>
<p>Candidates open testoza.com/join, type the code and wait in the lobby, so you see who has arrived before the paper begins rather than after. Press Start, or let the start time do it.</p>
<h3>The three hours</h3>
<p>The exam room shows each candidate’s minutes left and questions answered, and flags anything worth your attention: no signal, a changed device, warnings for leaving the exam screen if you switched on exam rules. Answers reach the server every 20 seconds, so at minute 140 a dead phone costs about twenty seconds of work: the candidate joins again on any device with the same details and carries on with the time that is left. If the building’s network stutters for everyone, give everyone still writing extra time; if one candidate’s signal dropped for five minutes, give that candidate five.</p>
<h3>The end</h3>
<p>When time runs out, papers submit themselves, so nobody is caught hunting for a button with ten seconds left. The rank list fills in as papers come in.</p>
<h3>Phones or a lab?</h3>
<p>The same test runs on both. A three-hour, 180-question paper is more comfortable on a laptop or in a computer lab, which is also closer to the real centre. If your batch only has phones, it works — and there is a separate guide to <a href="/mobile-friendly-online-exam">running exams on phones</a> — but give the full-length mocks priority for the lab.</p>
`),
                ],
            },
            {
                id: 'results',
                title: 'Reading a full-length result',
                tocLabel: 'Reading the result',
                kicker: 'Afterwards',
                blocks: [
                    html(`
<p>A full-length mock earns its three hours in the hour afterwards. These are the numbers worth reading, in order:</p>
<ol class="al-list al-list--num">
<li><strong>The rank list,</strong> with the class average, highest and lowest. It answers “how is the batch doing”, and nothing else.</li>
<li><strong>Section scores.</strong> A candidate at 520 in NEET with 160 in Biology and 90 in Physics needs a different week from one with the reverse. Section totals, not the overall score, decide what each student does next.</li>
<li><strong>Attempts against accuracy.</strong> A candidate who attempted 170 and got 120 right lost 50 marks to negative marking — almost a section’s worth of difference between a guesser and a careful candidate with the same knowledge.</li>
<li><strong>Time per question.</strong> The questions where a candidate spent three, four, five minutes are where the paper was lost, whether or not they got them right. Show students their own five slowest questions.</li>
<li><strong>The wrong option the batch chose.</strong> When half the class picks the same wrong option, you have found a misconception, not bad luck. That question is Monday’s lesson.</li>
<li><strong>The last hour.</strong> Compare accuracy on the first sixty questions with the last sixty. A large drop is a stamina problem, and more full papers — not more chapters — fix it.</li>
</ol>
<p>For parents, print report cards or send a short note with the marks on WhatsApp. For your own records, download everything as Excel. For candidates, release their own paper with the key when the exam ends, as each paper is submitted, or once you have checked it.</p>
`),
                ],
            },
            {
                id: 'series',
                title: 'Planning a test series around full-length mocks',
                tocLabel: 'A test series',
                kicker: 'The calendar',
                blocks: [
                    html(`
<p>Full-length mocks are expensive: three hours of each student’s week, and an evening of yours reading the result. Spend them where they do the most good.</p>
<ul class="al-list">
<li><strong>Through the year: one a month.</strong> Mostly to keep the exam’s shape in students’ heads and to give you a batch-wide baseline. Chapter and part tests do the teaching.</li>
<li><strong>From three months out: one every two weeks,</strong> on the exam’s pattern, at the exam’s time of day, with exam rules on.</li>
<li><strong>The last six weeks: one a week,</strong> ideally on the real exam’s day of the week, in a lab if you have one. The week after each, a short test built from the questions the batch got worst.</li>
<li><strong>Same paper, same day, for every batch.</strong> If morning and evening batches sit different papers, their raw marks aren’t comparable. Give them the same paper, or compare students by rank within their own batch.</li>
</ul>
<p>Keep each mock as a test in TestoZa after the sitting. A student who missed it can sit it later as a re-test, and next year’s batch can take it as practice.</p>
`),
                ],
            },
            {
                id: 'limits',
                title: 'What TestoZa doesn’t do for full-length mocks',
                tocLabel: 'Honest limits',
                kicker: 'Being straight',
                blocks: [
                    html(`
<p>Better to know these before your series starts than in week six:</p>
<ul class="al-limits">
<li><strong>No ready-made bank of full-length papers.</strong> You bring the questions — your own papers, previous years’ papers, your faculty’s sets — and the AI import turns them into tests quickly. There is a public test library, but it is not a substitute for your own series.</li>
<li><strong>No normalisation.</strong> Results are raw marks and a rank within the test. Exams such as SSC normalise across shifts; TestoZa doesn’t, so give every batch the same paper if you want to compare them.</li>
<li><strong>Section locks are enforced in the browser.</strong> They hold in practice and in a supervised sitting; they are not proof against someone who edits a web page’s code. Answers are always marked on the server.</li>
<li><strong>Two-paper days have limits.</strong> The break between papers is shown but not enforced, and in your analysis Paper 1 and Paper 2 are separate tests with their own rank lists. For a combined batch ranking, download both and add them.</li>
<li><strong>No descriptive answers.</strong> Questions are objective: single correct, multiple correct, numerical and passage-based, with matching lists set as tables. Essays and typed long answers are not marked.</li>
<li><strong>No offline mode.</strong> Candidates need a connection to start and to submit; answers are kept on the device through a dropped signal in between.</li>
</ul>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'What is a full-length mock test?',
                a: 'A mock that copies the real exam in every way that changes how a candidate behaves: the same number of questions, the full duration on the same kind of clock, the same sections, the exam’s marking scheme including negative and partial marks, the same question types and an exam-style screen with a question palette and Mark for review. A shorter or differently marked test is useful practice, but it rehearses a different exam.',
            },
            {
                q: 'How do I make a full-length mock test online for free?',
                a: 'In TestoZa, upload a previous paper as a PDF or photos (the AI reads questions, options, the key, diagrams and equations), split it into sections, set Marks and Wrong once on the first question, set the duration or time each section, read it through, and run it as a live exam with a six-digit code. Building and running tests, marking and rank lists are free.',
            },
            {
                q: 'Can I make a 180-question NEET mock with negative marking?',
                a: 'Yes. Create four sections of 45 questions (Physics, Chemistry, Botany, Zoology), set +4 and −1 once — each new question copies it — and 180 minutes on the clock. The candidate sees the NTA-style screen with subject tabs, a question palette and Mark for review, and the result splits by subject.',
            },
            {
                q: 'Can each section have its own timer, like SSC CGL?',
                a: 'Yes. Switch on Time each section and give each section its minutes — 15 each for SSC CGL Tier 1, 20 each for IBPS PO prelims. A section closes when its time runs out, stays closed, and unused time is not carried forward, as in the real exam.',
            },
            {
                q: 'What happens if a student’s phone dies during a three-hour mock?',
                a: 'On a live exam, answers reach the server every 20 seconds. The student joins again on any device with the same details and carries on from their saved answers with the time that is left; your exam room shows “Changed device” on their row.',
            },
            {
                q: 'Can I run JEE Advanced Paper 1 and Paper 2 together?',
                a: 'Yes. Build each paper as a test and use Combine two papers on the dashboard, with a break of 0 to 180 minutes (30 by default). Candidates get one combined score. In the faculty analysis the papers stay separate tests, so for a combined batch ranking download both results and add them.',
            },
            {
                q: 'Is Google Forms good enough for a full-length mock?',
                a: 'For a short quiz, yes. For a full-length mock it lacks a built-in timer, negative marking, partial credit, a question palette and Mark for review, and it only saves progress for respondents signed in to Google. An exam platform handles all of these and gives section-wise results and a rank list.',
            },
            {
                q: 'How long does it take to build a full-length paper?',
                a: 'If you have the paper as a PDF, the upload and settings take about ten minutes; reading all 75 to 180 questions through once takes the rest, typically twenty to thirty minutes. Typing a full paper by hand takes far longer, which is why most institutes upload.',
            },
            {
                q: 'Does TestoZa normalise marks across batches?',
                a: 'No. Results are raw marks and a rank within the test. To compare batches fairly, give them the same paper on the same day, or compare students by rank within their own batch.',
            },
        ],

        closingTitle: 'Build next Sunday’s full-length mock',
        closing: [
            html(`
<p>Take last year’s paper and make it this Sunday’s mock:</p>
<div class="al-paths">
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Paper as a PDF or photos?</span><span class="al-path-what">Upload it and let the AI read every question</span></a>
<a class="al-path" href="/create-test" data-icon="pencil"><span class="al-path-who">Building from scratch?</span><span class="al-path-what">Sections, Marks and Wrong, and a real clock</span></a>
<a class="al-path" href="/user-guide/live-exam-sessions" data-icon="key"><span class="al-path-who">Running it for the batch?</span><span class="al-path-what">See how join codes and the exam room work</span></a>
</div>
<p>Exam-specific guides: <a href="/jee-mock-test-platform">JEE Main</a>, <a href="/neet-online-test-software">NEET</a>, <a href="/jee-advanced-mock-test-software">JEE Advanced</a>, <a href="/ssc-mock-test-platform">SSC</a> and <a href="/bank-exam-mock-test-platform">bank exams</a>. Related: <a href="/create-mock-test-online">creating a mock test online</a>, <a href="/mobile-friendly-online-exam">exams on phones</a> and <a href="/pricing">pricing</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Exam patterns',
                links: [
                    { label: 'NTA (JEE Main, NEET UG)', href: 'https://nta.ac.in/' },
                    { label: 'JEE Advanced', href: 'https://jeeadv.ac.in/' },
                    { label: 'SSC', href: 'https://ssc.gov.in/' },
                    { label: 'IBPS', href: 'https://www.ibps.in/' },
                ],
            },
            {
                label: 'Google Forms',
                links: [{ label: 'Google Docs Editors Help (Forms)', href: 'https://support.google.com/docs' }],
            },
            {
                label: 'TestoZa',
                links: [
                    { label: 'AI test generator', href: 'https://testoza.com/ai-test-generator' },
                    { label: 'Live exam sessions', href: 'https://testoza.com/user-guide/live-exam-sessions' },
                    { label: 'Pricing', href: 'https://testoza.com/pricing' },
                ],
            },
        ],
    },
};
