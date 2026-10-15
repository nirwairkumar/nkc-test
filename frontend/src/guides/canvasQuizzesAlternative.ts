/**
 * testoza.com/canvas-quizzes-alternative — quizzes inside a course system next to an exam
 * platform: what the end of Free-for-Teacher changed, marking, Classic and New Quizzes,
 * enrolment versus a join code, keeping Canvas for teaching, and where Canvas wins.
 * Written for teachers who used Canvas mainly to run quizzes, tutors and coaching faculty.
 *
 * Canvas facts (checked 15 October 2026, sources in `sources`):
 *   - Instructure (press release, blog, try-canvas): Canvas Lite, free, for independent
 *     educators, tutors and homeschool teachers; "a cap of 5 courses with 50 learners per
 *     course and a 500 MB storage limit per course"; "identity verification for every
 *     teacher who signs up (using a government-issued ID and a selfie, through our
 *     verification partner, Veriff)"; live 30 September 2026 at canvaslite.instructure.com;
 *     no course analytics, attendance or API tokens.
 *   - University of Delaware Canvas team (September 2026): Free-for-Teacher was shut down
 *     in May 2026; FFT opened 30 September to 6 October for exports, then closed; Canvas
 *     Lite "will use New Quizzes only". Canvas Insider and others tie the shutdown to the
 *     May 2026 security incident. Instructure's own Canvas Lite pages don't mention FFT,
 *     so the page attributes this to university Canvas teams.
 *   - Instructure guides (New Quizzes): Multiple Answer questions can award "partial
 *     credit with penalty", deducting for each incorrect answer selected, and "Zero is the
 *     lowest possible score"; "Vary points by answer" on Multiple Choice. New question
 *     types: stimulus, ordering, categorisation, hot spot.
 *   - Classic Quizzes are being retired in favour of New Quizzes; universities set their
 *     own cut-over dates (examples in 2025-2027), so the page gives no single date.
 *
 * TestoZa claims: as verified for the earlier alternative guides. Not in the product, and
 * never to be implied: courses, modules, assignments, rubrics, discussions, a gradebook,
 * LTI or any LMS integration, essays, file uploads, attendance, mobile apps.
 */
import { ALT_RIVALS } from './altData';
import { compareFallback, fitFallback, markingFallback, moveFallback } from './altFallback';
import { CANVAS_QUIZZES_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const R = ALT_RIVALS.canvas;

export const CANVAS_QUIZZES_ALTERNATIVE: Guide = {
    meta: CANVAS_QUIZZES_META,
    body: {
        intro: [
            html(`
<p>Canvas is one of the best learning management systems in the world. Universities and schools run whole courses on it: modules, pages, assignments marked with rubrics in SpeedGrader, discussions, announcements and a gradebook that follows a student through the term. Quizzes are one tool in that kit, and inside a course they work well.</p>
<p>But a lot of individual teachers, tutors and coaching faculty never used Canvas for courses. They used Canvas Free-for-Teacher, the free account anyone could open, mostly to run quizzes. In 2026 that changed.</p>
<p>Canvas Free-for-Teacher was shut down in May 2026, after a security incident, and university Canvas teams told teachers to export their courses before the last export window closed on 6 October. Its replacement, Canvas Lite, opened on 30 September 2026. It is free, but Instructure’s own announcement lists the limits: five courses, 50 learners per course, 500 MB of storage per course, and an identity check for every teacher who signs up, using a government ID and a selfie through a company called Veriff.</p>
<p>If you used Canvas for teaching, Canvas Lite may suit you well. If you mostly used it to run quizzes and tests, this is a good moment to ask a simpler question: do your tests need a course system at all? This guide answers that honestly, including the cases where the answer is “yes, stay”.</p>
`),
        ],

        answer:
            'If you teach whole courses with modules, assignments, discussions and a gradebook, keep Canvas: quizzes inside a course are part of what it does well. If you mainly used Canvas, especially Free-for-Teacher, to run quizzes and tests, an exam platform is simpler. Free-for-Teacher was shut down in 2026; Canvas Lite is free but limited to five courses and 50 learners per course and asks every teacher for a government ID and a selfie. Canvas quizzes need enrolled students with logins, and Instructure’s documented penalty never takes a question below zero, so JEE-style −1 marking is not a standard setting. TestoZa runs tests outside any course: a batch joins with a six-digit code, papers mark +4/−1 with partial marks and numerical ranges on an NTA-style screen, and building and running tests is free, with paid plans at ₹49 for 7 days, ₹149 for 30 days or ₹799 a year. It has no courses, assignments or gradebook.',

        sections: [
            {
                id: 'what-you-use',
                title: 'A course system or an exam room?',
                tocLabel: 'Course or exam room',
                kicker: 'Start here',
                blocks: [
                    html(`
<p>Canvas is a learning management system: a home for everything about a course. An exam platform is narrower: a room where a paper is sat, marked and reported. Which one you need depends on what you actually do in Canvas.</p>
<p>Switch on what you use Canvas for:</p>
`),
                    { type: 'widget', widget: 'alt-fit', fallbackHtml: fitFallback(R) },
                    html(`
<p>If most of your ticks are on the course side, stay with Canvas, through your institution or Canvas Lite, and keep your quizzes there too. If most are on the testing side, the rest of this guide is for you.</p>
`),
                ],
            },
            {
                id: 'free-for-teacher',
                title: 'After Free-for-Teacher: what Canvas Lite changes',
                tocLabel: 'After Free-for-Teacher',
                kicker: 'What changed in 2026',
                blocks: [
                    html(`
<p>For years, Canvas Free-for-Teacher let any teacher open a free account and run a course, with quizzes, for any number of students. That is gone. University Canvas teams told teachers it was shut down in May 2026, reopened briefly so courses could be exported, and closed for good after 6 October 2026. Course content doesn’t move to the new product by itself.</p>
<p>The new free product is Canvas Lite. From Instructure’s own announcement and pages:</p>
<ul class="al-checks">
<li><strong>Who it is for:</strong> independent educators, tutors, homeschool teachers and community instructors, without an institutional licence.</li>
<li><strong>Limits:</strong> five courses, 50 learners per course, and 500 MB of storage per course.</li>
<li><strong>Identity check:</strong> every teacher who signs up verifies their identity with a government-issued ID and a selfie, through Veriff. Students invited by a teacher don’t.</li>
<li><strong>What it leaves out:</strong> course analytics, attendance and API access, which Free-for-Teacher had.</li>
<li><strong>Quizzes:</strong> university Canvas teams report that Canvas Lite uses New Quizzes only.</li>
</ul>
<h3>What that means for a teacher who mostly ran tests</h3>
<p>The 50-learner cap is the number to look at. A coaching batch is often 60, 120 or more. Fitting a batch of 120 into Canvas Lite means splitting it across three courses, and you only have five. A scholarship test for a few hundred outside students doesn’t fit at all.</p>
<p>The identity check is a reasonable security step after an incident, and many teachers won’t mind it. But it is a step you take to run what used to be a simple quiz.</p>
<p>TestoZa asks for an email address. Building tests, running live exams for a whole batch, marking, rank lists and report cards are free, with no course to create and no cap of 50.</p>
`),
                ],
            },
            {
                id: 'side-by-side',
                title: 'Canvas quizzes and an exam platform, question by question',
                tocLabel: 'Side by side',
                kicker: 'Side by side',
                blocks: [
                    html(`
<p>Five questions teachers actually ask, with both answers and what each means for you:</p>
`),
                    { type: 'widget', widget: 'alt-compare', fallbackHtml: compareFallback(R) },
                ],
            },
            {
                id: 'marking',
                title: 'Can a Canvas quiz mark like JEE or NEET?',
                tocLabel: 'Marking',
                kicker: 'The crux',
                blocks: [
                    html(`
<p>This is the question that matters most for exam preparation, so here is exactly what Instructure’s own New Quizzes guides say:</p>
<ul class="al-checks">
<li><strong>Multiple Answer questions</strong> can award partial credit with a penalty: points for each correct option ticked, points off for each wrong option ticked.</li>
<li><strong>Zero is the lowest possible score</strong> on such a question. The penalty can cancel the credit but never takes the question below zero.</li>
<li><strong>Multiple Choice questions</strong> can use “Vary points by answer” to give different options different points.</li>
</ul>
<p>What the guides don’t describe is the way JEE Main and NEET mark a single-answer question: +4 for the right answer, −1 for a wrong one, 0 for a blank. By default a wrong option on a Canvas multiple-choice question scores zero, the same as leaving it blank. If your institution’s Canvas has settings beyond the standard guides, test a negative-marked question before you plan a mock around it.</p>
<p>Why it matters: under +4/−1, four wrong guesses cancel a correct answer, so knowing when to leave a question blank is a real skill. A quiz where a wrong answer costs nothing teaches students to guess. Try it below: answer correctly, then press Again and answer wrong, and compare the two columns.</p>
`),
                    { type: 'widget', widget: 'alt-marking', fallbackHtml: markingFallback(R) },
                    html(`
<p>In TestoZa every question card has two fields, <strong>Marks</strong> and <strong>Wrong</strong>. JEE Main is +4 and −1, SSC Tier 1 is +2 and −0.5, bank prelims are +1 and −0.25, a school test is +1 and 0. Multiple-correct questions get partial marks, either proportional or by the JEE Advanced rule. Numerical answers are accepted within a range you set.</p>
`),
                ],
            },
            {
                id: 'new-quizzes',
                title: 'Classic Quizzes, New Quizzes, and the move between them',
                tocLabel: 'Classic and New Quizzes',
                kicker: 'The quiz engine',
                blocks: [
                    html(`
<p>Canvas has had two quiz engines for years. Classic Quizzes is the older one; New Quizzes is its replacement. Instructure is retiring Classic Quizzes, and universities have been setting their own cut-over dates between 2025 and 2027. Canvas Lite, according to university Canvas teams, runs New Quizzes only.</p>
<p>New Quizzes is a real improvement in places. It adds question types like stimulus (a passage or image with several questions), ordering, categorisation and hot spot, and it offers partial credit on several types. But teachers moving from Classic to New Quizzes report having to check converted quizzes question by question, and some settings behave differently.</p>
<p>If you are going to rebuild your quizzes anyway, it is worth rebuilding them where they fit best. For course quizzes, that is New Quizzes. For test series and mocks, consider an exam platform, where the paper is the whole point:</p>
<ul class="al-list">
<li><strong>One builder and one exam screen,</strong> with nothing being migrated under you.</li>
<li><strong>The question types entrance papers use:</strong> single and multiple-correct MCQs, numerical answers within a range, two-decimal answers, comprehension passages.</li>
<li><strong>An NTA-style screen:</strong> four-colour question palette, Mark for review, Save & Next, one clock, sections that can lock on their own timer.</li>
<li><strong>Papers from a PDF or photo:</strong> the AI reads questions, options, the key, diagrams and equations into the builder, in Hindi, English or both.</li>
</ul>
`),
                ],
            },
            {
                id: 'access',
                title: 'Enrolment and logins, or a join code',
                tocLabel: 'Getting students in',
                kicker: 'Exam day',
                blocks: [
                    html(`
<p>In Canvas, a quiz is an assignment inside a course, and the students who can take it are the students enrolled in that course, each with a Canvas login. For a semester class, that is exactly right: the same students, the same course, all term.</p>
<p>For a test series it is overhead. A one-off mock for an outside batch means creating a course, enrolling everyone and making sure every student can sign in. With Canvas Lite’s limits, a batch over 50 has to be split across courses.</p>
<p>A TestoZa live exam works differently:</p>
<ol class="al-list al-list--num">
<li><strong>You start a live exam</strong> for a batch and get a six-digit code, a QR code and a projector view.</li>
<li><strong>Students open <a href="/join">testoza.com/join</a></strong> on their phones, type the code and check in by name or roll number, optionally with a four-digit PIN. No account, no app.</li>
<li><strong>A lobby shows who has arrived.</strong> You press Start, or let it start at a set time.</li>
<li><strong>The live list</strong> shows who is writing, who submitted and who left the exam screen. Give one student +5 or +10 minutes, or everyone more time.</li>
<li><strong>Answers save every 20 seconds,</strong> so a dead phone means rejoining on another, not losing the paper.</li>
</ol>
<p>Canvas has good mobile apps for students. A TestoZa exam needs no app at all; it runs in the phone’s ordinary browser, which matters when students are on old phones with little storage.</p>
`),
                ],
            },
            {
                id: 'together',
                title: 'Keeping Canvas and running exams outside it',
                tocLabel: 'Using both',
                kicker: 'A practical plan',
                blocks: [
                    html(`
<p>Many teachers will keep Canvas for teaching and move only the tests. That works, with one honest caveat.</p>
<ul class="al-list">
<li><strong>Teach in Canvas.</strong> Modules, pages, assignments, discussions and announcements stay where they are.</li>
<li><strong>Post the exam in the course.</strong> Put the TestoZa join code or test link in an announcement or a page, at the time of the exam.</li>
<li><strong>Run the exam in TestoZa.</strong> The batch joins with the code, sits the paper on the exam screen, and you get the rank list and per-question numbers as papers come in.</li>
<li><strong>Bring the marks back by spreadsheet.</strong> Download the results as Excel and enter or import the totals into the Canvas gradebook.</li>
</ul>
<p>The caveat: there is no LTI or other integration between TestoZa and Canvas, so the marks don’t flow into the gradebook by themselves. The hand-off is a spreadsheet. If your institution needs every mark inside Canvas automatically, keep the quiz in Canvas. If a spreadsheet once a test is fine, you get exam-pattern marking and a batch on phones in exchange.</p>
`),
                ],
            },
            {
                id: 'move-one-paper',
                title: 'Moving one quiz, in about 20 minutes',
                tocLabel: 'Moving a quiz',
                kicker: 'Try it small',
                blocks: [
                    html(`
<p>Start with one quiz, ideally one you wanted to mark the way a real exam marks:</p>
`),
                    { type: 'widget', widget: 'alt-move', fallbackHtml: moveFallback(R, 'Your course stays in Canvas the whole time.') },
                    html(`
<p>Then compare: was the join code easier for your students than course enrolment and logins? Did the negative marking change the rank order? Was the per-question breakdown useful? If yes, move the next quiz; if not, you have lost twenty minutes.</p>
`),
                ],
            },
            {
                id: 'where-canvas-wins',
                title: 'Where Canvas wins, and it isn’t close',
                tocLabel: 'Where Canvas wins',
                kicker: 'Being straight',
                blocks: [
                    html(`
<p>Canvas is a far bigger product than an exam platform, and for a lot of teaching it is simply the better choice:</p>
<ul class="al-limits">
<li><strong>Whole courses.</strong> Modules, pages, files, embedded video, prerequisites and release dates. TestoZa has no courses at all.</li>
<li><strong>Assignments and feedback.</strong> File, text and URL submissions, rubrics, SpeedGrader with annotations and audio or video feedback. TestoZa doesn’t take essays or uploads.</li>
<li><strong>Discussions and messaging.</strong> A place for a class to talk. TestoZa has none.</li>
<li><strong>A gradebook.</strong> Every mark for a student, across a term, in one place. TestoZa keeps results per test and batch, and exports to Excel.</li>
<li><strong>Integrations.</strong> Google Drive, Zoom, Microsoft Teams and, in institutional Canvas, a whole ecosystem of LTI tools. TestoZa integrates with nothing.</li>
<li><strong>Mobile apps.</strong> Canvas Student and Canvas Teacher apps. TestoZa runs in the browser, with no app.</li>
<li><strong>Richer quiz types inside a course.</strong> Stimulus, ordering, categorisation and hot spot in New Quizzes.</li>
</ul>
<p>And to be plain about what TestoZa is: a tool that builds papers, runs exams on phones, marks them the way Indian exams mark, and reports to teachers and parents. If you teach courses, keep Canvas. If you mostly ran tests, you may not need a course system at all.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'What is the best Canvas quizzes alternative for teachers?',
                a: 'If you need a whole course system, look at other LMSs such as Moodle or Google Classroom, or use Canvas Lite. If you mainly need to run tests, use an exam platform: TestoZa lets a batch join with a six-digit code, marks +4/−1 with partial marks and numerical ranges on an NTA-style screen, and is free to build and run tests.',
            },
            {
                q: 'Is Canvas Free-for-Teacher still available?',
                a: 'No. University Canvas teams report it was shut down in May 2026 and closed for good after a final export window ending 6 October 2026. Its replacement, Canvas Lite, opened on 30 September 2026.',
            },
            {
                q: 'What are the limits of Canvas Lite?',
                a: 'From Instructure’s announcement: five courses, 50 learners per course and 500 MB of storage per course, with an identity check for every teacher using a government ID and a selfie through Veriff. Course analytics, attendance and API access are not included, and university Canvas teams report it uses New Quizzes only.',
            },
            {
                q: 'Can Canvas quizzes do negative marking like JEE or NEET?',
                a: 'Instructure’s New Quizzes guides describe a penalty on multiple-answer questions, with zero as the lowest possible score on the question, and a “vary points by answer” option on multiple choice. A −1 for a wrong answer on a single-answer question, as JEE Main and NEET mark, is not a setting the guides describe, so test it on your own Canvas first. TestoZa has Marks and Wrong on every question.',
            },
            {
                q: 'Do students need a Canvas account to take a quiz?',
                a: 'Yes, Canvas quizzes are taken by students enrolled in the course. A TestoZa live exam needs no account: students open testoza.com/join, type the six-digit code and check in by name or roll number.',
            },
            {
                q: 'Can I connect TestoZa to Canvas?',
                a: 'There is no LTI or other integration. Post the join code or test link in your Canvas course, and download TestoZa results as Excel to enter into the Canvas gradebook.',
            },
            {
                q: 'Can I move my Canvas quizzes to TestoZa?',
                a: 'There is no direct import. Print or export the quiz with its answers as a PDF, or use the paper you wrote it from, and upload it to the AI test generator, which reads questions, options, the key, diagrams and equations. Then set the marks and the duration.',
            },
            {
                q: 'Is TestoZa free?',
                a: 'Building tests, running live exams, marking, rank lists and report cards are free, with no limit on candidates. Paid plans (₹49 for 7 days, ₹149 for 30 days, ₹799 a year) add exam rules such as forced full screen and tab-switch limits.',
            },
        ],

        closingTitle: 'Teach in a course. Test in an exam room.',
        closing: [
            html(`
<p>Pick one quiz and run it as a real exam:</p>
<div class="al-paths">
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Quiz already written?</span><span class="al-path-what">Upload it as a PDF and let the AI read it</span></a>
<a class="al-path" href="/create-test" data-icon="pencil"><span class="al-path-who">Starting from scratch?</span><span class="al-path-what">Build it with +4/−1 and a real clock</span></a>
<a class="al-path" href="/user-guide/live-exam-sessions" data-icon="key"><span class="al-path-who">Running it for a batch?</span><span class="al-path-what">See how join codes and the exam room work</span></a>
</div>
<p>Related reading: <a href="/moodle-alternative">Moodle alternative</a>, <a href="/embed-test-on-website">putting a test on your website</a>, <a href="/how-to-conduct-online-exam">how to conduct an online exam</a>, <a href="/socrative-alternative">Socrative alternative</a> and <a href="/pricing">pricing</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Instructure (Canvas)',
                links: [
                    { label: 'Canvas Lite announcement', href: 'https://www.instructure.com/press-release/instructure-announces-canvas-lite-new-free-course-tool-built-educators' },
                    { label: 'Say hello to Canvas Lite', href: 'https://www.instructure.com/resources/blog/say-hello-canvas-lite' },
                    { label: 'Try Canvas Lite', href: 'https://www.instructure.com/try-canvas' },
                    { label: 'Multiple Answer questions in New Quizzes', href: 'https://community.instructure.com/en/kb/articles/661058-how-do-i-create-a-multiple-answer-question-in-new-quizzes' },
                    { label: 'Multiple Choice questions in New Quizzes', href: 'https://community.instructure.com/en/kb/articles/661059-how-do-i-create-a-multiple-choice-question-in-new-quizzes' },
                ],
            },
            {
                label: 'The end of Free-for-Teacher, as reported by a university Canvas team and Canvas Insider',
                links: [
                    { label: 'University of Delaware: Calling any Canvas Free for Teacher users', href: 'https://sites.udel.edu/canvas/2026/09/canvas-free-for-teacher-users/' },
                    { label: 'Canvas Insider: The final days of Free-for-Teacher', href: 'https://www.canvasinsider.blog/p/the-final-days-of-free-for-teacher' },
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
