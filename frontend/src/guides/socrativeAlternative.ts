/**
 * testoza.com/socrative-alternative — a lesson check-in next to a marked test: what a
 * percentage can and can't tell you, question types, room limits, a week that uses both,
 * and where Socrative wins. Written for school teachers, tutors and coaching faculty.
 *
 * Socrative facts (checked 15 October 2026, sources in `sources`):
 *   - socrative.com: "a product of Showbie Inc."; K-12, Higher Ed, Corporate, Vocational;
 *     3M+ teachers, 60M+ students a year; live polling, Space Races, exit tickets.
 *   - Plans page: Free $0, 1 room, 50 students per room, 5 quizzes, 30-day report history,
 *     AI 15 generations, 6 imports and 3 analyses a week. Essentials $10 a seat a month,
 *     $120 billed yearly, 5 rooms of 50. Pro $16.67 a seat a month, $200.04 billed yearly,
 *     minimum 2 seats, 30 rooms of 300. Organization $14.40 a seat a month, $172.80
 *     yearly, through sales, 30 rooms of 300.
 *   - Help centre: students join at gosocrative.com with a room name or QR code, no
 *     account needed; three question types (multiple choice, true/false, short answer
 *     marked correct only on an exact match); reports give each student a percentage
 *     with ticks and crosses; manual grading of short answers is a paid feature; Space
 *     Race is a team race with a time limit up to 45 minutes; quiz settings include
 *     require names, shuffle, feedback, one attempt and a time limit. No negative marking
 *     is described anywhere in the settings or help pages.
 *
 * TestoZa claims: as verified for the earlier alternative guides. Not in the product, and
 * never to be implied: team races, polls, word clouds, instant per-question feedback
 * during a live exam, a Google Drive integration, rostered rooms.
 */
import { ALT_RIVALS } from './altData';
import { compareFallback, fitFallback, markingFallback, moveFallback } from './altFallback';
import { SOCRATIVE_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const R = ALT_RIVALS.socrative;

export const SOCRATIVE_ALTERNATIVE: Guide = {
    meta: SOCRATIVE_META,
    body: {
        intro: [
            html(`
<p>Socrative is one of the most useful tools a teacher can have open in the middle of a lesson. You ask three questions, the class answers on their phones, and within a minute you know whether the idea you just explained landed or whether you need to explain it again. Exit tickets at the end of class, quick questions, a Space Race when energy is low: all of it is fast, simple and well thought out.</p>
<p>The trouble starts when the same tool gets asked to do a second job. Sooner or later a teacher needs a test whose marks go on a record: a weekly test, a unit test, a chapter test, or a mock for students sitting JEE, NEET, CUET, SSC or a bank exam. And the things that make Socrative quick in a lesson are the things that make it thin for that paper.</p>
<p>Socrative has three question types: multiple choice, true/false and short answer. It scores a quiz as a percentage, the share of questions answered correctly. A wrong answer counts the same as a blank. Its free plan gives you one room, up to 50 students and five quizzes.</p>
<p>None of that is a flaw for a check-in. All of it matters for a mock. JEE Main and NEET give +4 for a right answer and take 1 off for a wrong one. They include numerical answers and multiple-correct questions. The candidate sits a 180-question paper alone, on an exam screen with a question palette, against one clock. This guide shows where the line between the two jobs falls, and how to keep Socrative for the first while running the second properly.</p>
`),
        ],

        answer:
            'Keep Socrative for checking understanding during lessons, and use an exam platform for tests whose marks count. Socrative offers three question types (multiple choice, true/false and short answer), scores a quiz as a percentage with no negative marking, and its free plan allows one room of up to 50 students and five quizzes; Pro rooms go up to 300 students at $200.04 a year per seat. A mock for JEE, NEET, SSC or a bank exam needs +4/−1 or similar marking, numerical and multiple-correct questions, an NTA-style exam screen, a whole batch joining at once, and a rank list. TestoZa does that: building and running tests is free, paid plans are ₹49 for 7 days, ₹149 for 30 days or ₹799 a year, and students join with a six-digit code and no account. It has no Space Race, polls or live per-question feedback, which is what Socrative is for.',

        sections: [
            {
                id: 'what-you-use',
                title: 'A check-in and a test are different jobs',
                tocLabel: 'Two different jobs',
                kicker: 'Start here',
                blocks: [
                    html(`
<p>Teachers use the word “quiz” for two activities that want almost opposite things from software.</p>
<p><strong>A check-in is for the teacher.</strong> Its purpose is to change what you do next: re-teach the step half the class missed, move on, pair a confused student with a confident one. It should take two minutes, have no consequences for the student, and show results to you at once. A percentage is the right score, because you want to know how much of the room understood.</p>
<p><strong>A test is for the record.</strong> Its purpose is to measure, fairly and accurately, what each student can do, in a form you can show to the student, a parent and your own files. It should be marked the way the real exam is marked, sat alone, against a clock, and produce a rank and a breakdown.</p>
<p>Switch on what you actually use Socrative for:</p>
`),
                    { type: 'widget', widget: 'alt-fit', fallbackHtml: fitFallback(R) },
                    html(`
<p>For most teachers the honest answer is the middle one: keep Socrative for the lesson and move the paper. Nothing about running a marked test elsewhere makes your exit tickets any worse.</p>
`),
                ],
            },
            {
                id: 'two-scores',
                title: 'A percentage and a mark are different numbers',
                tocLabel: 'Percentage or marks',
                kicker: 'The crux',
                blocks: [
                    html(`
<p>This is the heart of it, so it is worth being exact. From Socrative’s own help pages:</p>
<ul class="al-checks">
<li><strong>A quiz is scored as a percentage.</strong> Each student’s report shows their percent score, each question, their answer, and a tick or cross.</li>
<li><strong>Short answers must match exactly.</strong> A short answer is marked correct only if it matches the answer you entered, spelling included. Changing that mark by hand afterwards is a paid feature.</li>
<li><strong>A wrong answer is the same as a blank.</strong> Neither adds to the percentage, and nothing is taken away. The quiz settings and help pages describe no negative marking.</li>
</ul>
<p>For a check-in, that is exactly right. For a mock of an exam with negative marking, it trains the wrong habit. If a wrong answer costs nothing, the smart move is to answer everything, guessing where unsure. In JEE Main or NEET, four wrong guesses cancel a correct answer, and learning when to leave a question blank is a real skill with real marks attached. A student who practises only under percentage scoring arrives at the real exam with the opposite instinct.</p>
<p>Try it. Answer the question below correctly, then press Again and answer it wrong, and compare the two scores. Switch between JEE, SSC, IBPS and School to see the scheme change:</p>
`),
                    { type: 'widget', widget: 'alt-marking', fallbackHtml: markingFallback(R) },
                    html(`
<p>In TestoZa the marking scheme is two fields on every question card, <strong>Marks</strong> and <strong>Wrong</strong>, and a new question copies the previous one’s. For a school unit test with no penalty, set Wrong to 0 and it behaves like a percentage. For an entrance mock, set +4 and −1. Same tool, the scheme your exam actually uses.</p>
`),
                ],
            },
            {
                id: 'side-by-side',
                title: 'Socrative and an exam platform, question by question',
                tocLabel: 'Side by side',
                kicker: 'Side by side',
                blocks: [
                    html(`
<p>Five questions a teacher actually asks, with both answers and what each means for you:</p>
`),
                    { type: 'widget', widget: 'alt-compare', fallbackHtml: compareFallback(R) },
                ],
            },
            {
                id: 'question-types',
                title: 'Three question types, and the ones an entrance paper uses',
                tocLabel: 'Question types',
                kicker: 'The paper',
                blocks: [
                    html(`
<p>Socrative’s three types, multiple choice, true/false and short answer, cover most of what a teacher asks in the middle of a lesson. An Indian entrance paper uses others, and a mock that leaves them out is practice for a different exam:</p>
<div class="al-table-wrap"><table class="al-table">
<thead><tr><th scope="col">Question type</th><th scope="col">Where it appears</th><th scope="col">In TestoZa</th></tr></thead>
<tbody>
<tr><th scope="row">Single-correct MCQ with negative marks</th><td>JEE Main, NEET, CUET, SSC, bank exams</td><td>Marks and Wrong on each question</td></tr>
<tr><th scope="row">Multiple-correct with partial marks</th><td>JEE Advanced, some university exams</td><td>Proportional, or the JEE Advanced rule</td></tr>
<tr><th scope="row">Numerical answer within a range</th><td>JEE Main Section B, JEE Advanced</td><td>A range, or exact to two decimals</td></tr>
<tr><th scope="row">Comprehension passage with questions</th><td>CUET, SSC English, bank exams</td><td>One passage, several questions</td></tr>
<tr><th scope="row">Equations, diagrams, chemical formulae</th><td>Physics, chemistry and maths papers</td><td>Read by the AI from a PDF or photo, or typed with an on-screen keyboard</td></tr>
<tr><th scope="row">Hindi or both languages</th><td>SSC, bank, state exams, Hindi-medium schools</td><td>Hindi throughout, typed with English letters if you like, and bilingual questions</td></tr>
</tbody>
</table></div>
<p>The short-answer type is worth one more note. Because Socrative marks a short answer correct only on an exact match, a numerical answer of “2.5” won’t match “2.50” or “5/2” unless you anticipated it. TestoZa’s numerical type accepts a range you set, which is how JEE marks numerical answers.</p>
`),
                ],
            },
            {
                id: 'signs',
                title: 'Signs your check-ins have quietly become tests',
                tocLabel: 'Signs it has changed',
                kicker: 'Spotting it',
                blocks: [
                    html(`
<p>Nobody decides to run their exams on a check-in tool. It happens a little at a time. These are the signs that a Socrative quiz has stopped being a check-in and started being a test:</p>
<ul class="al-list">
<li><strong>The percentages go into a register.</strong> Once a score is written down and kept, it is a test score, and it should be marked like one.</li>
<li><strong>You switch off feedback and add a time limit.</strong> Instant feedback is the point of a check-in. Turning it off to stop students sharing answers means the activity is now an exam.</li>
<li><strong>It gets its own period.</strong> A check-in takes two minutes inside a lesson. If the whole period is the quiz, it is a test.</li>
<li><strong>Students prepare for it.</strong> When students revise the night before, they expect a fair, exam-style mark at the end.</li>
<li><strong>Parents ask about it.</strong> A parent asking “what did my child get” needs a report card with marks, not a percentage on a projector.</li>
<li><strong>You average the scores into a grade.</strong> Averaging percentages from quizzes with no negative marking rewards the students who guess most.</li>
</ul>
<p>If two or three of these are true, keep Socrative for what it does best and move that activity to an exam platform. The students will notice the difference in the first week, and that is the point.</p>
`),
                ],
            },
            {
                id: 'room-limits',
                title: 'Rooms, 50 students, and the size of a batch',
                tocLabel: 'Room limits',
                kicker: 'Size',
                blocks: [
                    html(`
<p>Socrative organises everything into rooms. Students join at gosocrative.com with the room name or by scanning a QR code, and they don’t need accounts, which is one of the nicest things about it. The plan you are on decides how many rooms you have and how many students fit in each:</p>
<ul class="al-list">
<li><strong>Free:</strong> 1 room, up to 50 students, 5 quizzes, 30 days of reports.</li>
<li><strong>Essentials:</strong> $10 a seat a month, billed yearly as $120. 5 rooms of up to 50.</li>
<li><strong>Pro:</strong> $16.67 a seat a month, billed yearly as $200.04, with a minimum of 2 seats. 30 rooms of up to 300.</li>
<li><strong>Organization:</strong> $14.40 a seat a month, through sales. 30 rooms of up to 300.</li>
</ul>
<p>For a class of 35, the free room is plenty. For a coaching batch of 120 sitting one mock together, you are into Pro, in dollars, per teacher. The five-quiz limit on the free plan also bites quickly once you start a weekly test series.</p>
<p>In TestoZa a live exam takes the whole batch with one six-digit code, on the free plan. Candidates open <a href="/join">testoza.com/join</a>, type the code and check in by name or roll number, optionally with a four-digit PIN, with no account, just like Socrative’s room name. You can save as many papers as you like, and the paid plans (₹49 for 7 days, ₹149 for 30 days, ₹799 a year) add the exam rules rather than room sizes.</p>
`),
                ],
            },
            {
                id: 'both',
                title: 'Using both well in the same week',
                tocLabel: 'Using both',
                kicker: 'A practical plan',
                blocks: [
                    html(`
<p>The best arrangement isn’t a switch. It is a division of labour, simple enough to write on a timetable:</p>
<ul class="al-list">
<li><strong>During lessons, Socrative.</strong> A quick question when you introduce a new idea, an exit ticket at the end of the period. Percentages, instant results, no consequences. This is how you decide tomorrow’s lesson.</li>
<li><strong>Friday, a short marked test.</strong> Ten to twenty questions on the week, on the exam screen, with your exam’s marking. Say out loud that this one is marked like the real exam, so a guess costs marks.</li>
<li><strong>Once a month, a full mock.</strong> Full length, full time, sections if the real paper has them, exam rules on. The rank list goes up and the report cards go home.</li>
<li><strong>After each mock, back to Socrative.</strong> The per-question analysis tells you which five questions the batch got most wrong, and which wrong option they chose. Turn those into Monday’s quick questions.</li>
</ul>
<p>Students understand the difference quickly, as long as you name it. The check-in is for learning, with no penalty. The test is for measuring, marked like the real thing.</p>
`),
                ],
            },
            {
                id: 'move-one-paper',
                title: 'Moving the test that counts, in about 20 minutes',
                tocLabel: 'Moving a paper',
                kicker: 'Try it small',
                blocks: [
                    html(`
<p>Nothing leaves Socrative. Take the one test whose marks matter and set it up properly:</p>
`),
                    { type: 'widget', widget: 'alt-move', fallbackHtml: moveFallback(R, 'Your exit tickets and Space Races stay exactly as they are.') },
                    html(`
<p>Afterwards, compare the rank list with your Socrative percentages for the same students. If the paper was marked like your exam, the order will have shifted, especially among students who answer everything quickly. That shift is the information percentage scoring couldn’t give you.</p>
`),
                ],
            },
            {
                id: 'where-socrative-wins',
                title: 'Where Socrative wins',
                tocLabel: 'Where Socrative wins',
                kicker: 'Being straight',
                blocks: [
                    html(`
<p>An honest comparison says where the other tool is better. For Socrative, that is a real list:</p>
<ul class="al-limits">
<li><strong>Speed in a lesson.</strong> A quick question goes out in seconds. TestoZa asks you to think about marks, duration and sections, which is overhead you don’t want for a mid-lesson check.</li>
<li><strong>Instant feedback for students.</strong> Socrative can show a student whether each answer was right as they go, with explanations. A TestoZa exam shows results only when the paper ends, as an exam should.</li>
<li><strong>Space Race and team play.</strong> Teams racing across the projector, sharing devices or not. TestoZa has no game modes at all.</li>
<li><strong>Exit tickets and polls.</strong> Purpose-built, quick, and anonymous if you want. TestoZa doesn’t do polls.</li>
<li><strong>Younger classes and every subject.</strong> For a class of ten-year-olds or a literature discussion, a check-in is the right tool and an exam screen would be odd.</li>
<li><strong>Integrations and rosters.</strong> Rostered rooms and Google Drive exports fit a school’s systems. TestoZa exports to Excel and stops there.</li>
</ul>
<p>And to be clear about what TestoZa isn’t: no game modes, no polls, no live feedback during a paper, no LMS integration. It builds papers, runs exams, marks them and reports on them. So the recommendation is the same as the timetable above: keep the check-in, fix the paper.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'What is the best Socrative alternative for real tests?',
                a: 'If you want another quick check-in tool, look at the same category: Kahoot, Wayground (formerly Quizizz), Mentimeter, Plickers. If you need tests whose marks count, use exam software instead: negative marking, numerical and multiple-correct questions, an NTA-style screen, and a rank list. TestoZa is one, free to build and run tests on.',
            },
            {
                q: 'Does Socrative support negative marking?',
                a: 'Socrative’s quiz settings and help pages describe no negative marking. Quizzes are scored as a percentage of correct answers, and a wrong answer counts the same as a blank. That suits a lesson check-in, not a mock of an exam that deducts marks for wrong answers.',
            },
            {
                q: 'How many students can join a Socrative room?',
                a: 'On the free and Essentials plans, up to 50 students per room. On Pro and Organization, up to 300. The free plan has one room and five quizzes; Essentials has 5 rooms and Pro 30. A TestoZa live exam takes a whole batch with one code on the free plan.',
            },
            {
                q: 'What question types does Socrative have?',
                a: 'Three: multiple choice, true/false and short answer. A short answer is marked correct only if it matches the expected answer exactly. TestoZa adds multiple-correct questions with partial marks, numerical answers within a range, two-decimal answers and comprehension passages.',
            },
            {
                q: 'Is there a free Socrative alternative?',
                a: 'TestoZa is free to build tests and run live exams for a whole batch, with marking, rank lists, per-question analysis and report cards. Paid plans (₹49 for 7 days, ₹149 for 30 days, ₹799 a year) add exam rules like forced full screen and tab-switch limits.',
            },
            {
                q: 'Do students need an account, like Socrative’s room name?',
                a: 'No. Like Socrative, students join without an account: they open testoza.com/join, type a six-digit code and check in by name or roll number, optionally with a PIN.',
            },
            {
                q: 'Can I import my Socrative quizzes into TestoZa?',
                a: 'There is no direct import. Download or print the quiz as a PDF, or use the paper you wrote it from, and upload it to the AI test generator, which reads questions, options, the key, diagrams and equations. Then set the marks and the duration.',
            },
            {
                q: 'Should I stop using Socrative?',
                a: 'No. Keep it for checking understanding during lessons, where it is quick and good. Use an exam platform for weekly tests and mocks whose marks go on a record. The two together work better than either alone.',
            },
        ],

        closingTitle: 'Keep the check-in. Fix the paper.',
        closing: [
            html(`
<p>Pick the test whose marks actually count, and give it twenty minutes:</p>
<div class="al-paths">
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Paper already written?</span><span class="al-path-what">Upload the PDF and let the AI read it</span></a>
<a class="al-path" href="/create-test" data-icon="pencil"><span class="al-path-who">Starting from scratch?</span><span class="al-path-what">Build it with +4/−1 and a real clock</span></a>
<a class="al-path" href="/user-guide/live-exam-sessions" data-icon="key"><span class="al-path-who">Running it for a class?</span><span class="al-path-what">See how join codes and the exam room work</span></a>
</div>
<p>Related reading: <a href="/kahoot-alternative">Kahoot alternative</a>, <a href="/how-to-conduct-online-exam">how to conduct an online exam</a>, <a href="/math-test-maker">math tests with equations</a>, <a href="/ai-test-generator">the AI test generator</a> and <a href="/pricing">pricing</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Socrative',
                links: [
                    { label: 'Socrative', href: 'https://www.socrative.com/' },
                    { label: 'Plans', href: 'https://www.socrative.com/plans/' },
                    { label: 'Frequently asked questions', href: 'https://help.socrative.com/en/articles/2155283-frequently-asked-questions' },
                    { label: 'Create a new quiz', href: 'https://help.socrative.com/en/articles/2155311-create-a-new-quiz' },
                    { label: 'The student experience', href: 'https://help.socrative.com/en/articles/15195950-the-student-experience-in-socrative' },
                    { label: 'Deliver a Space Race', href: 'https://help.socrative.com/en/articles/2155306-deliver-a-space-race' },
                ],
            },
            {
                label: 'Exam patterns quoted',
                links: [
                    { label: 'NTA (JEE Main, NEET)', href: 'https://nta.ac.in/' },
                    { label: 'SSC', href: 'https://ssc.gov.in/' },
                    { label: 'IBPS', href: 'https://www.ibps.in/' },
                ],
            },
            {
                label: 'TestoZa',
                links: [
                    { label: 'Pricing', href: 'https://testoza.com/pricing' },
                    { label: 'Live exam sessions', href: 'https://testoza.com/user-guide/live-exam-sessions' },
                    { label: 'Join an exam', href: 'https://testoza.com/join' },
                ],
            },
        ],
    },
};
