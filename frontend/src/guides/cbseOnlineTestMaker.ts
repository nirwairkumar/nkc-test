/**
 * testoza.com/cbse-online-test-maker — CBSE-style online tests for Classes 6 to 12: chapter
 * tests, the objective part of periodic tests, and practice before the pre-boards and board
 * exams. Written for CBSE school teachers, exam cells and tuition teachers on the CBSE syllabus.
 *
 * Facts and where they come from:
 *   - CBSE publishes sample question papers and marking schemes for Classes 10 and 12 every
 *     year on cbseacademic.nic.in, with objective questions (MCQs, assertion–reason),
 *     case-based / source-based questions and written answers of 2, 3 and 5 marks. The exact
 *     share of each type differs by subject and is not quoted here, because sources disagree
 *     for 2026-27; readers are sent to the sample papers.
 *   - Class 10 board exams twice a year from 2026: a main exam in February and a second,
 *     optional exam in May for improvement, on the same syllabus (CBSE, approved June 2025).
 *   - Most subjects: 80 marks theory, 20 marks internal assessment. No negative marking.
 *   - TestoZa behaviour: see the header of testMakerData.ts.
 */
import { TEST_MAKER_PAGES } from './testMakerData';
import { compareFallback, scenariosFallback, stepsFallback } from './howtoFallback';
import { CBSE_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const P = TEST_MAKER_PAGES.cbse;

export const CBSE_ONLINE_TEST_MAKER: Guide = {
    meta: CBSE_META,
    body: {
        intro: [
            html(`
<p>A CBSE paper today is not the paper most teachers sat themselves. Alongside short and long answers, it carries one-mark MCQs, assertion and reason questions, and case-based questions where students read a passage, a table or a graph and answer several questions about it. CBSE calls the aim “competency”: applying what was learned to something unfamiliar, rather than repeating a textbook answer.</p>
<p>Those objective and case-based questions are exactly the part of a paper that an online test can set and mark for you. A student can practise thirty of them on a phone in the time it takes to write one long answer, see what they got wrong straight away, and do it again next week. The written answers still belong on paper, marked by a teacher.</p>
<p>This guide shows how to build CBSE-style tests from NCERT chapters and sample papers, which question types map to what, how to use tests through the school year, and what to keep in the notebook. We make <a href="/">TestoZa</a>, and every example uses it.</p>
`),
        ],

        answer:
            'A CBSE online test maker should set the objective part of a CBSE paper: MCQs, assertion–reason questions, case-based questions under one passage, and numerical answers, marked with no negative marking. In TestoZa you upload an NCERT exercise, a chapter or a CBSE sample paper as a PDF or photo, and the AI reads or writes the questions; you check them, keep one mark per question, and share a link or a class code. Students take it on their phones and see their marks and mistakes when they submit, and you get chapter-wise results. Written 2-, 3- and 5-mark answers are not marked online, so keep those on paper. Building tests is free.',

        sections: [
            {
                id: 'cbse-paper',
                title: 'What a CBSE paper looks like now',
                tocLabel: 'The CBSE paper',
                kicker: 'The basics',
                blocks: [
                    html(`
<p>Three things about the current CBSE system shape what an online test should do.</p>
<ul class="al-list">
<li><strong>Papers mix objective and written questions.</strong>CBSE’s sample papers for Classes 10 and 12 include one-mark MCQs and assertion–reason questions, case-based or source-based questions with several parts, and written answers worth 2, 3 or 5 marks. The mix differs by subject, so the year’s sample paper for each subject is the reference.</li>
<li><strong>Class 10 has two board exams a year.</strong>From 2026, Class 10 students sit the main board exam in February and can take a second exam in May to improve their scores, on the same syllabus. That gives a second revision season, aimed at the chapters where marks were lost.</li>
<li><strong>Internal assessment counts.</strong>In most subjects 80 marks come from the board exam and 20 from internal assessment, which includes periodic tests through the year.</li>
</ul>
<p>And one thing that makes CBSE different from competitive exams: <strong>there is no negative marking</strong>. A wrong answer scores nothing, and so does a blank. Practice tests for CBSE should be marked the same way, so students learn to attempt every objective question.</p>
<p class="al-note">CBSE publishes sample question papers and marking schemes on <a href="https://cbseacademic.nic.in/" target="_blank" rel="noopener noreferrer">cbseacademic.nic.in</a> every year. Upload them into TestoZa as PDFs and use them as practice tests, alongside your own questions.</p>
`),
                ],
            },
            {
                id: 'question-types',
                title: 'Each CBSE question type, and what an online test does with it',
                tocLabel: 'Question types',
                kicker: 'Question by question',
                blocks: [
                    html(`
<p>Go through a CBSE paper part by part and the split is clear: most objective questions move online well, and written answers don’t.</p>
`),
                    { type: 'widget', widget: 'hw-compare', fallbackHtml: compareFallback(P) },
                    html(`
<p>The same mapping as a table, with the settings to use:</p>
<div class="al-table-wrap al-table-wrap--wide"><table class="al-table">
<thead><tr><th scope="col">CBSE question</th><th scope="col">TestoZa question type</th><th scope="col">Marks</th><th scope="col">Notes</th></tr></thead>
<tbody>
<tr><th scope="row">MCQ, one correct</th><td data-label="TestoZa type">Single correct</td><td data-label="Marks">1, Wrong 0</td><td data-label="Notes">Four options, as printed</td></tr>
<tr><th scope="row">Assertion and reason</th><td data-label="TestoZa type">Single correct</td><td data-label="Marks">1, Wrong 0</td><td data-label="Notes">Assertion and reason in the question; the four standard options</td></tr>
<tr><th scope="row">Case-based or source-based</th><td data-label="TestoZa type">Passage / case study</td><td data-label="Marks">1 per sub-question</td><td data-label="Notes">The passage once, its questions under it; leave shuffling off</td></tr>
<tr><th scope="row">Maths and science numericals</th><td data-label="TestoZa type">Numerical answer</td><td data-label="Marks">As you choose</td><td data-label="Notes">A range such as 9.7 to 9.9; the working stays in the notebook</td></tr>
<tr><th scope="row">Internal choice (“attempt any one”)</th><td data-label="TestoZa type">A section with an attempt limit</td><td data-label="Marks">As the paper</td><td data-label="Notes">The section counts only as many answers as you allow</td></tr>
<tr><th scope="row">Short and long answers</th><td data-label="TestoZa type">Not marked online</td><td data-label="Marks">-</td><td data-label="Notes">Keep on paper, marked against CBSE’s scheme</td></tr>
</tbody>
</table></div>
<p>Here is how an assertion–reason question reads in a TestoZa test, exactly as a student sees it:</p>
<blockquote>
<p><strong>Assertion (A):</strong> The resistance of a wire increases when its length is doubled.<br><strong>Reason (R):</strong> The resistance of a conductor is directly proportional to its length.</p>
<p>(a) Both A and R are true, and R is the correct explanation of A.<br>(b) Both A and R are true, but R is not the correct explanation of A.<br>(c) A is true, but R is false.<br>(d) A is false, but R is true.</p>
</blockquote>
<p>Students lose most marks on these questions between options (a) and (b). That is a reading habit, and a few weeks of short tests fix it better than any explanation on the board.</p>
`),
                ],
            },
            {
                id: 'build',
                title: 'How to make a CBSE test from an NCERT chapter',
                tocLabel: 'Make a test',
                kicker: 'Step by step',
                blocks: [
                    html(`
<p>You rarely need to type a question. The questions you want are already in the NCERT textbook, its exemplar, a CBSE sample paper or your own notes. TestoZa reads them.</p>
${stepsFallback(P)}
<p>Three details make the test feel like a CBSE paper rather than a quiz:</p>
<ul class="al-list">
<li><strong>Sections named like the paper.</strong>Section A for MCQs and assertion–reason, Section B for case studies. Each student’s result then shows their score in each section.</li>
<li><strong>Equations and formulas that display properly.</strong>Fractions, powers, roots, trigonometry and chemical equations are typed with a maths keyboard and typeset, not pasted as blurry pictures. Diagrams can be added as pictures to any question or option.</li>
<li><strong>The same language as the class.</strong>Tests can be in English, in Hindi, or in both, one under the other, for Hindi-medium sections.</li>
</ul>
<p class="al-note">Check every AI question against the textbook before you share it. The AI is fast and usually right, but you know the syllabus, and a question from outside it costs students’ trust in the test.</p>
`),
                ],
            },
            {
                id: 'through-year',
                title: 'Tests through the CBSE school year',
                tocLabel: 'Through the year',
                kicker: 'When to use it',
                blocks: [
                    html(`
<p>The same tool serves several jobs in a school year. Pick the one you are planning:</p>
`),
                    { type: 'widget', widget: 'hw-scenarios', fallbackHtml: scenariosFallback(P) },
                    html(`
<p>A simple rhythm for a CBSE class: a chapter test of 15 to 20 questions when each chapter ends, the objective part of every periodic test online, and from December, one mixed practice test a week from sample papers. For Class 10, keep the habit going after February for students taking the second exam in May.</p>
`),
                ],
            },
            {
                id: 'run',
                title: 'Running it: in the computer lab, the classroom or at home',
                tocLabel: 'Running it',
                kicker: 'On the day',
                blocks: [
                    html(`
<p>Students take TestoZa tests in a phone, tablet or computer browser. There is nothing to install and no student accounts to create. That makes three set-ups possible:</p>
<div class="al-cards">
<div class="al-card" data-tone="blue" data-icon="key"><h3>In the computer lab</h3><p>Start a live test and write the six-digit code on the board. Students type it at testoza.com/join with their roll number. You see who has joined and who has submitted.</p></div>
<div class="al-card" data-tone="orange" data-icon="layers"><h3>In the classroom</h3><p>Where the school allows phones or tablets, the same code works. Papers submit themselves when the time is up.</p></div>
<div class="al-card" data-tone="purple" data-icon="doc"><h3>At home</h3><p>Share the test link in the class group for homework or holiday practice, with more than one attempt allowed if it is for revision.</p></div>
</div>
<p>Results are ready the moment students submit. Each student sees their marks, the correct answers and the solutions you added. You see a rank list, the questions most of the class got wrong, and each section’s average, and you can print report cards or download an Excel sheet.</p>
`),
                ],
            },
            {
                id: 'limits',
                title: 'What to keep on paper',
                tocLabel: 'Keep on paper',
                kicker: 'Honest limits',
                blocks: [
                    html(`
<p>An online test is the right tool for part of CBSE preparation, not all of it. Keep these on paper:</p>
<ul class="al-limits">
<li><strong>Written answers of 2, 3 and 5 marks.</strong> TestoZa marks objective and numerical answers only. Writing a structured answer is a skill students practise by writing.</li>
<li><strong>Maths working and step marks.</strong> A numerical question checks the final answer, not the method that CBSE gives marks for.</li>
<li><strong>Diagrams, maps and constructions students draw.</strong> Students can identify a diagram online, but drawing one is paper work.</li>
<li><strong>The board exam itself.</strong> CBSE board exams are written on paper. Online tests are practice for them, and some practice should always be a full written paper under exam conditions.</li>
</ul>
<p>Used this way, online tests take the checking load of objective questions off teachers, so the time saved can go into marking written answers properly.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'Can I make CBSE-style online tests for free?',
                a: 'Yes. TestoZa is free for building tests, sharing them by link or class code, and seeing results. Paid plans from ₹49 for 7 days add exam rules such as full screen, the school’s name and logo on tests, scheduling and Excel export.',
            },
            {
                q: 'Does it support assertion and reason questions?',
                a: 'Yes. Set them as single correct questions, with the assertion and reason in the question and the four standard options. The AI keeps them in that form when it reads a CBSE sample paper.',
            },
            {
                q: 'How do I make case-based questions?',
                a: 'Choose the Passage / case study question type, write or paste the passage, table or data once, and add its questions under it. The questions appear together under the passage on the exam screen. Leave question shuffling off for tests with case studies.',
            },
            {
                q: 'Is there negative marking in CBSE online tests?',
                a: 'CBSE board exams have no negative marking, so practice tests shouldn’t either. New TestoZa tests start at one mark per question and nothing taken off for a wrong answer, which matches CBSE.',
            },
            {
                q: 'Can students write long answers in the online test?',
                a: 'No. TestoZa marks objective and numerical answers only. Keep 2-, 3- and 5-mark written answers on paper, marked against CBSE’s marking scheme.',
            },
            {
                q: 'Can I make a test from an NCERT chapter PDF?',
                a: 'Yes. Upload the chapter or a photo of the exercise and choose Extract to copy the printed questions, or Generate to write new questions from the chapter. Check each one against the textbook before sharing.',
            },
            {
                q: 'Does it work in Hindi for Hindi-medium classes?',
                a: 'Yes. Questions can be in Hindi, or in Hindi and English one under the other. Teachers can type Hindi in English letters, and the AI can write Hindi questions from an English chapter.',
            },
            {
                q: 'Which classes can use it?',
                a: 'Any class with objective questions: Classes 6 to 12 on the CBSE syllabus, and the same tests work for state boards and ICSE schools. It is most useful from Class 9, when board-style papers begin.',
            },
        ],

        closingTitle: 'Start with the chapter you’re teaching now.',
        closing: [
            html(`
<p>Upload this week’s NCERT exercise, keep the marking CBSE uses, and send the link to the class. One chapter test will tell you whether it fits your school.</p>
<div class="al-paths">
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Have the chapter or a sample paper?</span><span class="al-path-what">Upload it and let the AI read it</span></a>
<a class="al-path" href="/create-test" data-icon="pencil"><span class="al-path-who">Writing your own questions?</span><span class="al-path-what">Open the test builder</span></a>
<a class="al-path" href="/user-guide/live-exam-sessions" data-icon="key"><span class="al-path-who">Testing in the lab?</span><span class="al-path-what">See how class codes work</span></a>
</div>
<p>Related reading: <a href="/math-test-maker">maths test maker</a>, <a href="/chemistry-question-paper-maker">chemistry question paper maker</a>, <a href="/hindi-online-test-maker">Hindi online test maker</a>, <a href="/online-test-for-tuition-teachers">online tests for tuition teachers</a> and <a href="/guides">all guides</a>.</p>
`),
        ],

        sources: [
            {
                label: 'CBSE',
                links: [
                    { label: 'CBSE Academic: sample question papers and marking schemes', href: 'https://cbseacademic.nic.in/' },
                    { label: 'CBSE', href: 'https://www.cbse.gov.in/' },
                ],
            },
            {
                label: 'NCERT',
                links: [{ label: 'NCERT textbooks', href: 'https://ncert.nic.in/textbook.php' }],
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
