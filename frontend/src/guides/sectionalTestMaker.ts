/**
 * testoza.com/sectional-test-maker — making sectional tests: one-section drills and full
 * papers split into sections with their own minutes, attempt limits and marks. Written for
 * SSC, bank and CAT faculty and test-series makers, and for school teachers who set papers
 * in sections A, B and C.
 *
 * Not the same page as /ssc-mock-test-platform (every SSC pattern in detail) or
 * /full-length-online-test-maker (rehearsing a whole paper). This one is about sections as
 * a building block, whatever the exam.
 *
 * Facts and where they come from:
 *   - SSC CGL and CHSL 2026 Tier 1: four sections of 25 questions, 15 minutes each, fixed
 *     order, no going back; +2/−0.5 (as researched for sscMockTestPlatform.ts).
 *   - IBPS PO, SBI PO and IBPS Clerk 2026 prelims: three sections of 20 minutes each, with the
 *     question counts in bankData.ts. Marks per section are not quoted, because sources
 *     disagree for IBPS PO.
 *   - CAT: three sections (VARC, DILR, QA), 40 minutes each, fixed order (iimcat.ac.in).
 *   - JEE Main and NEET: subjects as sections on one clock (jeeMockTestPlatform.ts,
 *     neetOnlineTestSoftware.ts).
 *   - TestoZa behaviour: see the header of testMakerData.ts.
 */
import { TEST_MAKER_PAGES } from './testMakerData';
import { compareFallback, scenariosFallback, stepsFallback } from './howtoFallback';
import { SECTIONAL_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const P = TEST_MAKER_PAGES.sectional;

export const SECTIONAL_TEST_MAKER: Guide = {
    meta: SECTIONAL_META,
    body: {
        intro: [
            html(`
<p>Ask an SSC or bank aspirant what they practised this week and the answer is usually “two sectionals and a full mock”. Sectional tests are a normal part of exam preparation in India, and in 2026 they became more important. SSC CGL and CHSL Tier 1 now give each of their four sections its own 15 minutes, and a section closes when its time runs out. The bank prelims have run 20-minute sections for years. When the real exam times every section separately, speed has to be built one section at a time.</p>
<p>The phrase “sectional test” is used for two different things, and a good sectional test maker has to do both:</p>
<ul class="al-list">
<li><strong>A sectional drill</strong>One section on its own, at the exam’s pace: 25 Quant questions in 15 minutes, or 35 Reasoning questions in 20.</li>
<li><strong>A sectioned paper</strong>A full paper divided into sections, where each section can have its own minutes, its own attempt limit and its own marking.</li>
</ul>
<p>This guide explains when each one helps, the four rules a section can carry, which exam patterns use them, and how to build and read a sectional test in <a href="/">TestoZa</a>. We make TestoZa, so the last section lists what it can’t do with sections yet.</p>
`),
        ],

        answer:
            'A sectional test maker lets you divide a test into sections and give each section its own rules. In TestoZa you split the questions into sections in the builder, then give each section its own minutes (it closes when they run out and can’t be reopened), an attempt limit such as “answer any 20 of 25”, and its own marks and negative marks. Students see the sections in order on the exam screen, and the result shows marks, right, wrong and skipped answers for each section. Use one-section drills to build speed and full sectioned papers to check that the speed holds under the real pattern. Building tests is free.',

        sections: [
            {
                id: 'two-kinds',
                title: 'Two kinds of sectional test, and when each one helps',
                tocLabel: 'Two kinds',
                kicker: 'The basics',
                blocks: [
                    html(`
<p>Drills and sectioned papers do different jobs, so a good test series uses both, in a fixed rhythm through the week.</p>
<div class="al-table-wrap"><table class="al-table">
<thead><tr><th scope="col"></th><th scope="col">Sectional drill</th><th scope="col">Sectioned full paper</th></tr></thead>
<tbody>
<tr><th scope="row">What it is</th><td data-label="Sectional drill">One section, at the exam’s length and time</td><td data-label="Sectioned full paper">The whole paper, with every section on its own rules</td></tr>
<tr><th scope="row">How long</th><td data-label="Sectional drill">15 to 40 minutes</td><td data-label="Sectioned full paper">The exam’s full duration</td></tr>
<tr><th scope="row">What it trains</th><td data-label="Sectional drill">Speed and accuracy in one subject</td><td data-label="Sectioned full paper">Keeping that speed when sections come back to back, and stamina</td></tr>
<tr><th scope="row">How often</th><td data-label="Sectional drill">Three or four times a week, one section each</td><td data-label="Sectioned full paper">Once a week, usually on Sunday</td></tr>
<tr><th scope="row">What to read in the result</th><td data-label="Sectional drill">Questions attempted, accuracy, time per question</td><td data-label="Sectioned full paper">Which section drags the total down, and the rank</td></tr>
</tbody>
</table></div>
<p>The rhythm matters more than the number of tests. A student who sits a Quant drill on Monday, English on Tuesday, Reasoning on Wednesday and General Awareness on Thursday arrives at Sunday’s full paper having practised each section at full speed. The full paper then answers one question: does that speed survive when four sections come in a row, with no break between them?</p>
<p>In TestoZa both are built the same way. A drill is simply a test with one section. A sectioned paper is the same builder with several sections and their rules switched on.</p>
`),
                ],
            },
            {
                id: 'section-rules',
                title: 'The four rules a section can carry',
                tocLabel: 'Section rules',
                kicker: 'Settings',
                blocks: [
                    html(`
<p>A section is more than a heading over some questions. Each of these four rules is set on the section, or on the questions inside it, and each one copies something real exams do.</p>
<ol class="al-steps">
<li><strong>Its own clock</strong>Switch on “Time each section” and type each section’s minutes. The test’s time becomes their total. Sections open one after another in the paper’s order. When a section’s minutes are up it closes, the next one opens, and nobody can go back, move ahead early or carry spare minutes forward. This is how SSC CGL and CHSL Tier 1, the bank prelims and CAT work.</li>
<li><strong>An attempt limit</strong>Open the section’s Attempt limit and type the most a student may answer. A <em>hard</em> limit stops them answering more. A <em>soft</em> limit lets them answer more, but only some count: either the first ones they answered or their best-scoring ones. Use it for papers that say “answer any 20 of 25” or for internal choice in school papers.</li>
<li><strong>Its own marking</strong>Every question has a Marks box and a Wrong box, so one section can be +1/−0.25 and the next +2/−0.5. Papers where sections are worth different amounts, such as bank mains, are set question by question, with decimals where needed.</li>
<li><strong>Shuffling that stays inside it</strong>When you switch on question shuffling, questions are mixed within their section, never across sections. Section 1 stays first and every student sees its own questions in it, just in a different order.</li>
</ol>
<p class="al-note">Section rules are independent. A school paper might use attempt limits and no clocks; an SSC mock uses clocks and no attempt limits; a JEE paper uses sections only to group subjects, on one three-hour clock.</p>
`),
                ],
            },
            {
                id: 'one-clock',
                title: 'One clock for the paper, or one clock per section',
                tocLabel: 'One clock or many',
                kicker: 'The difference',
                blocks: [
                    html(`
<p>The biggest decision in a sectional test is the clock. It changes how students spend time, what they do with a skipped question, and what the result can tell you.</p>
`),
                    { type: 'widget', widget: 'hw-compare', fallbackHtml: compareFallback(P) },
                    html(`
<p>A worked example shows why it matters. Take a student who answers SSC Quant at a minute a question and General Awareness at 15 seconds. On one 60-minute clock, the minutes saved in General Awareness go to Quant and every question gets attempted. With 15 minutes per section, Quant fits only 15 of its 25 questions, and the saved minutes are simply lost. Our <a href="/ssc-mock-test-platform">SSC guide</a> puts that at roughly 16 marks for an ordinary candidate, with the same knowledge and accuracy. The fix is faster Quant, about 36 seconds a question, and the only way to build it is drills on a 15-minute clock.</p>
`),
                ],
            },
            {
                id: 'patterns',
                title: 'Exam patterns that use sections',
                tocLabel: 'Exam patterns',
                kicker: 'Patterns',
                blocks: [
                    html(`
<p>Most Indian competitive exams divide the paper into sections. What differs is whether each section has its own time. Use this table to decide which rules to switch on.</p>
<div class="al-table-wrap al-table-wrap--wide"><table class="al-table">
<thead><tr><th scope="col">Exam</th><th scope="col">Sections</th><th scope="col">Time</th><th scope="col">Rules to switch on</th></tr></thead>
<tbody>
<tr><th scope="row">SSC CGL and CHSL 2026, Tier 1</th><td data-label="Sections">Reasoning, General Awareness, Quantitative Aptitude, English: 25 questions each</td><td data-label="Time">15 minutes per section, fixed order</td><td data-label="Rules">Time each section; +2/−0.5</td></tr>
<tr><th scope="row">IBPS PO 2026, Prelims</th><td data-label="Sections">English 30, Quantitative Aptitude 35, Reasoning 35</td><td data-label="Time">20 minutes per section</td><td data-label="Rules">Time each section; five options; −¼ of the question’s marks</td></tr>
<tr><th scope="row">SBI PO 2026, Prelims</th><td data-label="Sections">English 40, Quantitative Aptitude 30, Reasoning 30</td><td data-label="Time">20 minutes per section</td><td data-label="Rules">Time each section; five options; −¼</td></tr>
<tr><th scope="row">IBPS Clerk 2026, Prelims</th><td data-label="Sections">English 30, Numerical Ability 35, Reasoning 35</td><td data-label="Time">20 minutes per section</td><td data-label="Rules">Time each section; five options; −¼</td></tr>
<tr><th scope="row">CAT</th><td data-label="Sections">Verbal Ability and Reading Comprehension; Data Interpretation and Logical Reasoning; Quantitative Ability</td><td data-label="Time">40 minutes per section, fixed order</td><td data-label="Rules">Time each section; +3/−1 on multiple choice, 0 on typed answers</td></tr>
<tr><th scope="row">JEE Main</th><td data-label="Sections">Physics, Chemistry, Mathematics</td><td data-label="Time">One 3-hour clock</td><td data-label="Rules">Sections for subjects, no section timing; +4/−1</td></tr>
<tr><th scope="row">NEET UG</th><td data-label="Sections">Physics, Chemistry, Botany, Zoology</td><td data-label="Time">One clock for the paper</td><td data-label="Rules">Sections for subjects, no section timing; +4/−1</td></tr>
<tr><th scope="row">School and board papers</th><td data-label="Sections">Sections A, B, C… by question type</td><td data-label="Time">One clock</td><td data-label="Rules">Sections, attempt limits for internal choice, no negative marks</td></tr>
</tbody>
</table></div>
<p class="al-note">Patterns change. Before a test series starts, check the year’s official notification for section order, timing and marks. Our <a href="/ssc-mock-test-platform">SSC</a> and <a href="/bank-exam-mock-test-platform">bank exam</a> guides cover each pattern in detail, and the <a href="/full-length-online-test-maker">full-length test guide</a> covers a whole paper.</p>
`),
                ],
            },
            {
                id: 'build',
                title: 'How to make a sectional test in TestoZa',
                tocLabel: 'Make one',
                kicker: 'Step by step',
                blocks: [
                    html(`
<p>Here is the whole job, from a PDF to a link, for a paper of about 50 questions.</p>
${stepsFallback(P)}
<p>Two shortcuts save most of the time. First, the “+” between two questions offers <strong>Split section</strong>, which turns a long list of imported questions into sections in a few taps, sharing the minutes by question count. The “+” between two sections offers <strong>Merge</strong>, with an Undo if you change your mind. Passages stay whole: a split can’t cut a passage’s questions apart. Second, for a trial, set every section to one or two minutes, sit the paper yourself and watch a section close, then put the real minutes back before you share it.</p>
<p>To make a <strong>drill</strong> from a section of a full paper, build a short test with just that section’s questions and its real minutes. Students then get the same section under the same clock, as many times as you like.</p>
`),
                ],
            },
            {
                id: 'exam-screen',
                title: 'What students see during a sectional test',
                tocLabel: 'On the exam screen',
                kicker: 'Exam day',
                blocks: [
                    html(`
<p>On the exam screen, sections appear in order and the open one is marked. With section timing on, the clock shows the open section’s time, and a closed section can’t be opened again. Here is what happens in the moments that cause most questions from students.</p>
`),
                    { type: 'widget', widget: 'hw-scenarios', fallbackHtml: scenariosFallback(P) },
                    html(`
<p>Tell the batch three rules before the first timed-sections test: spare minutes stay in their section, a closed section is gone, and skipped questions don’t come back. Students who hear this before the first paper lose far fewer marks in it.</p>
`),
                ],
            },
            {
                id: 'drills',
                title: 'Using sectional drills to build speed',
                tocLabel: 'Building speed',
                kicker: 'Teaching',
                blocks: [
                    html(`
<p>The point of a sectional drill is a speed target that the student can see. Work it out from the exam: minutes for the section divided by its questions.</p>
<div class="al-table-wrap"><table class="al-table">
<thead><tr><th scope="col">Section</th><th scope="col">Questions and minutes</th><th scope="col">Time per question</th></tr></thead>
<tbody>
<tr><th scope="row">SSC Tier 1, any section</th><td data-label="Questions and minutes">25 in 15</td><td data-label="Time per question">36 seconds</td></tr>
<tr><th scope="row">IBPS PO prelims, Quant</th><td data-label="Questions and minutes">35 in 20</td><td data-label="Time per question">about 34 seconds</td></tr>
<tr><th scope="row">SBI PO prelims, English</th><td data-label="Questions and minutes">40 in 20</td><td data-label="Time per question">30 seconds</td></tr>
<tr><th scope="row">CAT, any section</th><td data-label="Questions and minutes">22 to 24 in 40</td><td data-label="Time per question">under 2 minutes</td></tr>
</tbody>
</table></div>
<p>Three habits are worth teaching on purpose, and drills are where they get learned:</p>
<ul class="al-list">
<li><strong>Every section has its own speed target.</strong>36 seconds a question applies to Quant as much as to General Awareness. The slow section can no longer borrow time.</li>
<li><strong>Skipping needs a rule.</strong>In a 15-minute section there is no “come back at the end”. A rule such as “if I can’t start it in 20 seconds, I leave it” has to be practised, not just agreed with.</li>
<li><strong>Spare minutes are for re-checking.</strong>A student who finishes English in nine minutes should spend the other six on the answers they were unsure of. The next section won’t open sooner.</li>
</ul>
<p>Keep drills short and frequent. Four 15-minute drills spread over a week do more for section speed than one extra full paper, and they are easier to fit around classes.</p>
`),
                ],
            },
            {
                id: 'results',
                title: 'Reading a section-wise result',
                tocLabel: 'Section results',
                kicker: 'After the test',
                blocks: [
                    html(`
<p>Each student’s result shows their score in every section, with how many answers were right, wrong and skipped. Your own report adds a sections card for the whole batch, a rank list and question-by-question figures. Three patterns tell you what to do next:</p>
<div class="al-cards">
<div class="al-card" data-tone="blue" data-icon="layers"><h3>Many skipped</h3><p>A speed problem. The student ran out of minutes. More drills in that section, with a skip rule.</p></div>
<div class="al-card" data-tone="orange" data-icon="pencil"><h3>Many wrong</h3><p>A knowledge or guessing problem. Re-teach the topics behind the wrong answers and talk about when to guess.</p></div>
<div class="al-card" data-tone="purple" data-icon="sparkles"><h3>Low in one section only</h3><p>A section that drags the total. With sectional cut-offs, as in bank exams, this one fails the paper on its own.</p></div>
</div>
<p>Because every student had the same minutes for each section, these numbers can be compared across the batch. That is half the value of timed sections: on a single clock, one student’s weak Quant score may simply mean they spent their time on English.</p>
`),
                ],
            },
            {
                id: 'limits',
                title: 'What TestoZa doesn’t do with sections yet',
                tocLabel: 'Limits',
                kicker: 'Honest limits',
                blocks: [
                    html(`
<p>We would rather you found these here than on the day of a mock:</p>
<ul class="al-limits">
<li><strong>Sectional cut-offs aren’t applied automatically.</strong> The result shows each section’s score; checking it against a cut-off is done by eye or in the Excel export.</li>
<li><strong>The calculator is one switch for the whole test.</strong> Bank mains show a calculator in Data Analysis only; in TestoZa it is either on for every section or off.</li>
<li><strong>Students can’t choose the order of timed sections.</strong> They open in the paper’s order, as in SSC and CAT. Untimed sections can be visited in any order.</li>
<li><strong>Section locks are enforced in the browser.</strong> That holds in practice and in a supervised room, but it is not proof against someone editing the page’s code. Answers are still marked on our server.</li>
</ul>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'What is a sectional test?',
                a: 'A sectional test is either a short test on one section of an exam, such as 25 Quant questions in 15 minutes, or a full paper divided into sections that each have their own rules, such as their own time limit. Coaching institutes use both: drills during the week and a sectioned full paper on Sunday.',
            },
            {
                q: 'How do I make a test with a separate timer for each section?',
                a: 'In TestoZa, split the test into sections, switch on “Time each section” and type each section’s minutes. The test’s total time becomes the sum. Sections then open one after another, close when their time is up, and can’t be reopened, as in SSC CGL Tier 1 and the bank prelims.',
            },
            {
                q: 'Can students go back to an earlier section?',
                a: 'Not when sections are timed. A closed section stays closed, even after a refresh or when the student joins again on another phone. If sections are not timed, students can move between them freely until the paper’s time ends.',
            },
            {
                q: 'What happens if a student finishes a section early?',
                a: 'The section stays open until its time ends, so they can re-check their answers in it. The next section does not open sooner, and spare minutes are not carried forward. This matches how SSC’s 2026 Tier 1 pattern is reported to work.',
            },
            {
                q: 'Can I set “attempt any 20 out of 25” in a section?',
                a: 'Yes. Open the section’s Attempt limit and type 20. With a hard limit, students can’t answer more than 20. With a soft limit, they can answer more but only 20 count: either the first 20 they answered or their 20 best-scoring answers, whichever you choose.',
            },
            {
                q: 'Can different sections have different marks and negative marks?',
                a: 'Yes. Every question has its own Marks and Wrong boxes, so one section can be +1/−0.25 and another +2/−0.5. Decimals work, so papers like bank mains, where sections carry different marks per question, can be copied exactly.',
            },
            {
                q: 'Does the result show section-wise marks?',
                a: 'Yes. Each student sees their score in every section with the number of right, wrong and skipped answers. The examiner’s report adds a sections card for the batch, a rank list and an Excel export.',
            },
            {
                q: 'Is there a free sectional test maker?',
                a: 'TestoZa is free for building sectional tests, timed sections and attempt limits included, and for sharing them and seeing results. Paid plans from ₹49 for 7 days add exam rules such as full screen and tab-switch limits, branding and Excel export.',
            },
        ],

        closingTitle: 'Build one section first.',
        closing: [
            html(`
<p>Start with a single drill for the section your students find hardest, at the exam’s real minutes. Next week, put four of them together into a full sectioned paper.</p>
<div class="al-paths">
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Have the paper as a PDF?</span><span class="al-path-what">Upload it and split it into sections</span></a>
<a class="al-path" href="/create-test" data-icon="pencil"><span class="al-path-who">Starting from scratch?</span><span class="al-path-what">Build sections and give each its minutes</span></a>
<a class="al-path" href="/user-guide/live-exam-sessions" data-icon="key"><span class="al-path-who">Running it for a batch?</span><span class="al-path-what">See how join codes and the exam room work</span></a>
</div>
<p>Related reading: <a href="/ssc-mock-test-platform">SSC mock tests</a>, <a href="/bank-exam-mock-test-platform">bank exam mocks</a>, <a href="/online-test-with-negative-marking">online tests with negative marking</a>, <a href="/full-length-online-test-maker">full-length mock tests</a> and <a href="/guides">all guides</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Exam patterns',
                links: [
                    { label: 'Staff Selection Commission', href: 'https://ssc.gov.in/' },
                    { label: 'IBPS', href: 'https://www.ibps.in/' },
                    { label: 'SBI Careers', href: 'https://sbi.co.in/web/careers' },
                    { label: 'CAT', href: 'https://iimcat.ac.in/' },
                    { label: 'JEE Main (NTA)', href: 'https://jeemain.nta.nic.in/' },
                    { label: 'NEET UG (NTA)', href: 'https://neet.nta.nic.in/' },
                ],
            },
            {
                label: 'TestoZa',
                links: [
                    { label: 'Pricing', href: 'https://testoza.com/pricing' },
                    { label: 'Live exam sessions', href: 'https://testoza.com/user-guide/live-exam-sessions' },
                ],
            },
        ],
    },
};
