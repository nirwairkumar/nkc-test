/**
 * testoza.com/best-online-test-platform — what an online test platform has to
 * do, where common tools fall short, and how TestoZa serves teachers, coaching
 * institutes and students who practise on their own.
 *
 * Every product claim here was checked against the code on 2026-09-27:
 *   - AI import: src/pages/AITestImporter.tsx (PDF, Word, PowerPoint, photos and
 *     in-page camera; Extract vs Generate; English / Hindi / bilingual; difficulty)
 *   - Exam mode and its rules: src/pages/TestPage.tsx, src/components/TestSettingsPanel.tsx
 *     (the settings panel — full screen, tab switches, copy/paste, shuffle, schedule,
 *     start form, violation limit — needs a paid plan; starting a live exam link does not)
 *   - Branding and Excel export are paid (TestBuilder.tsx, TestResultsPanel.tsx)
 *   - Results: ResultsPage.tsx (topic strength, AI mentor chat, AI rank estimate),
 *     FullTestAnalysisPage.tsx (rank list), BehavioralTimeMatrix (time per question)
 *   - Visibility: documentation/2026-05-09-test-visibility-and-security-model.md
 * Competitor facts come from their own help pages (see `sources`).
 * Do not add claims the product can't back up (e.g. QR codes and independent
 * section timers are NOT in the product). Numerical answers do accept a min–max
 * range (TestBuilder, backend/app/services/scoring.py).
 */
import { BEST_PLATFORM_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

export const BEST_ONLINE_TEST_PLATFORM: Guide = {
    meta: BEST_PLATFORM_META,
    body: {
        intro: [
            html(`
<p>Most people find out how good their online test platform is on a bad day. A Sunday mock for sixty students, the link dropped into the batch WhatsApp group, and then the messages start. The timer isn't showing. One phone keeps reloading. Two students swear they submitted and nothing arrived. And somebody's score is a little too perfect.</p>
<p>We built <a href="/">TestoZa</a> after watching days like that happen to teachers we know. So this isn't a neutral list of ten apps. It's a practical guide to what an online test platform has to get right, written by the people who make one, with honest notes on where another tool is the better pick.</p>
`),
        ],

        answer:
            'For a quick classroom quiz, a form tool is enough. For anything that has to feel like a real exam (a countdown, negative marking, section rules, limits on switching tabs and results that show where marks were lost), use a dedicated test platform. TestoZa does all of this in any phone browser, turns PDFs, photos of pages and YouTube lessons into tests with AI, and is free to start. Students can also use it on their own to build practice tests from a photo of their textbook.',

        sections: [
            {
                id: 'checklist',
                title: 'What an online test platform actually has to do',
                tocLabel: 'Checklist',
                kicker: 'The seven jobs',
                blocks: [
                    html(`
<p>Strip away the feature lists and every platform has seven jobs. Whatever you pick should do all of them without add-ons, extra plugins or a separate app for your students.</p>
<ol class="gd-criteria">
<li><strong>Get questions in quickly.</strong> Typing ninety questions by hand is where most tests die. A good platform takes the material you already have: a chapter PDF, an old paper, a photo of a page, a video lesson.</li>
<li><strong>Look and feel like the real exam.</strong> A countdown, a question palette, mark for review, section tabs. Students who practise on something that looks like the computer-based test they'll face waste less time on the day.</li>
<li><strong>Mark it your way.</strong> +4 and −1 for JEE Main, numerical answers, partial credit on multi-correct questions. If the platform can't follow your scheme, you'll be fixing scores in a spreadsheet at midnight.</li>
<li><strong>Keep it fair.</strong> Full screen, limits on switching tabs, no copy and paste, shuffled questions. None of it is perfect, but there's a real difference between an accidental open-book test and something that clearly feels like an exam.</li>
<li><strong>Work on the phones students actually own.</strong> Plenty of students don't have a laptop. The test has to load on a budget Android over patchy mobile data, hold on to answers when the network blinks, and never ask anyone to install an app.</li>
<li><strong>Tell you something afterwards.</strong> The score is the least useful number on the page. You want time per question, accuracy by topic and, for a batch, a rank list.</li>
<li><strong>Cost what the job is worth.</strong> A teacher running a weekly class test shouldn't pay enterprise prices. An institute running branded, locked-down mocks for five hundred students should expect to pay something.</li>
</ol>
`),
                ],
            },
            {
                id: 'usual-tools',
                title: 'Where the usual tools fall short',
                tocLabel: 'Usual tools',
                kicker: 'Honest notes',
                blocks: [
                    html(`
<p>Most of us start with whatever is already open in another tab. That's sensible, and for low-stakes quizzes it's often all you need. Here's where each kind of tool runs out of road.</p>
<div class="gd-tools">
<article class="gd-tool" data-mark="G" data-tone="violet"><h3>Google Forms</h3>
<p>Free, familiar and very good at collecting answers. As an exam tool it has gaps. There's no built-in countdown timer (you need a third-party add-on), no native negative marking, and its locked mode, the setting that stops students leaving the quiz, works only on school-managed Chromebooks. For a ten-question recap at the end of a lesson it's fine. For a JEE-pattern mock you'll be patching it together.</p></article>
<article class="gd-tool" data-mark="F" data-tone="blue"><h3>Microsoft Forms</h3>
<p>Better on timing: a quiz can carry a timer anywhere from 1 to 999 minutes and submits itself when time runs out. It still behaves like a form rather than an exam hall, and it makes most sense if your school already runs on Microsoft 365.</p></article>
<article class="gd-tool" data-mark="M" data-tone="orange"><h3>Moodle</h3>
<p>Powerful, open source and used by universities around the world, with timed quizzes and serious question banks. The catch is running it. Someone has to host it, update it and configure it. Negative marking is possible, but it's set answer option by answer option and depends on the quiz's feedback settings, so a simple "−1 for every wrong answer" takes some setting up.</p></article>
<article class="gd-tool" data-mark="▶" data-tone="pink"><h3>Game-style quiz apps</h3>
<p>Kahoot and Wayground (the new name for Quizizz) are brilliant for energy in a classroom: live leaderboards, music, a room full of students racing each other. They're built for engagement. An exam-pattern paper with a CBT-style interface and strict marking isn't really what they're for.</p></article>
<article class="gd-tool" data-mark="$" data-tone="slate"><h3>Paid testing suites</h3>
<p>Tools like ClassMarker are mature, secure and well documented. They're priced with companies and certification programmes in mind: the free tier caps how many tests get graded, and the paid plans are billed monthly in US dollars. That's reasonable for corporate training. It's a lot for a tuition teacher with two batches.</p></article>
</div>
`),
                ],
            },
            {
                id: 'teachers',
                title: 'For teachers: from a chapter to a finished test in one sitting',
                tocLabel: 'Teachers',
                kicker: 'Making the paper',
                blocks: [
                    html(`
<p>Here's what a normal evening looks like on TestoZa if you teach, say, Class 11 physics and want a test ready for tomorrow.</p>
<ol class="gd-steps">
<li><strong>Bring what you already have.</strong> Open the <a href="/generate-with-ai">AI test generator</a> and upload a chapter PDF, a Word file of last year's paper, your class slides, or photos of textbook pages. On a phone you can take the photos right there with the camera.</li>
<li><strong>Pick a mode.</strong> <em>Extract</em> copies the questions, options and diagrams from an existing paper exactly as they are. <em>Generate</em> writes new questions from the content. Choose English, Hindi or both for a bilingual paper, and set the difficulty.</li>
<li><strong>Edit the draft.</strong> Everything lands in the editor as a normal paper. Rewrite a question, fix an option, change the marks, delete the weak ones. Maths and chemistry notation render properly, and the Sy Pad symbol keyboard saves you from hunting for √ and ∫.</li>
<li><strong>Set the marking.</strong> Give each question its own marks and negative marks (−0.25, −1, whatever your exam uses), split the paper into sections, and add rules like "attempt any 5 of these 10".</li>
<li><strong>Share the link.</strong> Students open it in any browser and start. They don't need an account unless you want them to sign in.</li>
</ol>
<p>Question types cover what school and entrance papers actually use: single-correct and multi-correct MCQs, numerical answers, and comprehension passages with a set of questions under them. You can also build a paper from scratch in the <a href="/create-test">test builder</a> if you'd rather type.</p>
<p>One honest word about the AI. It's quick, not infallible. Read what it gives you before you publish, especially the answer keys for numericals. But checking a draft is a very different job from staring at a blank page, and it's usually the difference between a test tomorrow and a test next week. The <a href="/user-guide/ai-test-generation">AI generation guide</a> walks through each screen, and <a href="/pdf-to-quiz">PDF to quiz</a> covers uploads in more detail.</p>
`),
                ],
            },
            {
                id: 'coaching',
                title: 'For coaching institutes: running a proper mock test',
                tocLabel: 'Coaching',
                kicker: 'Exam day',
                blocks: [
                    html(`
<p>A weekly mock for three batches is a different animal. You need control over who gets in, what students can do during the test and what you see afterwards.</p>
<p>On TestoZa any test can become a live exam with its own link. The test drops out of public listings, only people with that link can open it, and only you see the batch's results. When it's over you can end the exam and keep the paper private, or publish it so students can reattempt it as practice.</p>
`),
                    {
                        type: 'widget',
                        widget: 'live-exam',
                        fallbackHtml:
                            '<p>During a live exam the teacher sees attempts come in as students start and submit, along with any warnings, such as a student leaving full screen.</p>',
                    },
                    html(`
<ul class="gd-ticks">
<li><strong>Exam rules.</strong> Force full screen, count tab switches and auto-submit after a limit you choose, block copy and paste, shuffle the questions. Every warning is logged against the student.</li>
<li><strong>A start form.</strong> Students fill in their name, roll number, batch or whatever else you need before the timer begins.</li>
<li><strong>Scheduling.</strong> An exam window that opens and closes on its own, so nobody starts early.</li>
<li><strong>Your branding.</strong> The institute's name and logo on the exam screen.</li>
<li><strong>Full-length mocks in parts.</strong> Combine several papers into one session with a break screen between them.</li>
<li><strong>Results as papers arrive.</strong> A rank list, section-wise and topic-wise breakdowns and every attempt in one table, with an Excel export for your records.</li>
</ul>
<p>During the test, each student's progress is kept on their own device, a small indicator shows when the connection drops and comes back, and the screen stays awake so a phone doesn't lock halfway through question 40.</p>
<p>Now the money part, plainly. Creating tests, the AI generator and live exam links are free. The exam rules, scheduling, start forms, branding and Excel export belong to the paid plans, which come as weekly, monthly or yearly passes, so you can pay just for exam season. Current prices are on the <a href="/pricing">pricing page</a>, and <a href="/online-test-for-coaching">TestoZa for coaching institutes</a> and the <a href="/user-guide/conduct-exam">conduct-exam guide</a> cover the setup.</p>
`),
                ],
            },
            {
                id: 'students',
                title: 'For students: turn a textbook photo into a real mock test',
                tocLabel: 'Students',
                kicker: 'Practising alone',
                blocks: [
                    html(`
<p>This is the part most people don't expect. You don't need a teacher to use TestoZa. If you're preparing for boards, JEE, NEET, CUET or a state exam on your own, you can make practice tests out of whatever you're studying.</p>
<p>Say your unit test is on Monday and all you have is the chapter and last year's question paper. Here's the routine:</p>
<ol class="gd-steps">
<li><strong>Sign in.</strong> It's free. Then open the <a href="/generate-with-ai">AI test generator</a> on your phone.</li>
<li><strong>Photograph the pages.</strong> Tap the camera and shoot the old paper, or the chapter itself. Flat pages in good light work best.</li>
<li><strong>Choose how to use them.</strong> For the old paper, pick <em>Extract</em> to get its questions exactly as printed. For the chapter, pick <em>Generate</em> and ask for twenty or thirty new questions at the level you're aiming for.</li>
<li><strong>Make it feel real.</strong> Set the timer and marking to match your exam, and keep the test private so it's only yours.</li>
<li><strong>Take it in one sitting.</strong> No notes, phone on silent. It's the closest thing to an exam hall you can set up at home.</li>
</ol>
<p>Then comes the useful bit. The results page shows your score, your accuracy and the time you spent on every question, with your topics sorted into strong, moderate and weak. An AI mentor on the same page can go through your mistakes with you, because it knows which questions you got wrong. For tests tagged with exams like JEE, NEET, SSC, RRB or GATE, you can also ask for a rough rank estimate for your score; treat it as a guess, not a promise.</p>
<p>The next day, photograph the pages behind your weakest topic and do it again. Three or four rounds of that beat reading the chapter a fifth time. And if you don't feel like making a test at all, the <a href="/explore">test library</a> has public papers shared by teachers, with subject pages like <a href="/create-test/physics">physics</a> and <a href="/create-test/chemistry">chemistry</a> to start from.</p>
<p>Two honest limits. A blurry photo makes a messy paper, so retake anything you can't read yourself. And AI-written answer keys can be wrong now and then, so if a result looks off, check it against the book before you lose sleep over it.</p>
`),
                ],
            },
            {
                id: 'results',
                title: 'What happens after the last question',
                tocLabel: 'Results',
                kicker: 'After the test',
                blocks: [
                    html(`
<p>Results are where a test platform earns its keep, and they matter to both sides of the desk.</p>
`),
                    {
                        type: 'widget',
                        widget: 'results-rings',
                        fallbackHtml:
                            '<p>A student’s results show the score, accuracy and time per question, with each topic marked strong, moderate or weak.</p>',
                    },
                    html(`
<p>A student sees more than a mark out of 180. They see which questions ate their time, which topics they can stop worrying about and which ones need another round, plus the worked solutions if the teacher has added them.</p>
<p>A teacher sees the whole batch: who finished, who ran out of time, the rank list, and the topics where the class as a whole went wrong. That last one is the real payoff. If half the room misses the same three questions on rotational motion, tomorrow's lesson has just planned itself. The <a href="/user-guide/view-results-guide">results guide</a> shows where each number lives, and <a href="/auto-grading-software">auto-grading</a> explains how marking works.</p>
`),
                ],
            },
            {
                id: 'compare',
                title: 'TestoZa next to the usual options',
                tocLabel: 'Compare',
                kicker: 'Side by side',
                blocks: [
                    html(`
<div class="gd-table-wrap">
<table class="gd-table">
<thead><tr><th scope="col">What you need</th><th scope="col" class="gd-us">TestoZa</th><th scope="col">Google Forms</th><th scope="col">Moodle</th></tr></thead>
<tbody>
<tr><th scope="row">Countdown timer that submits on time</th><td data-label="TestoZa" class="gd-us gd-yes">Yes</td><td data-label="Google Forms" class="gd-no">Only with an add-on</td><td data-label="Moodle" class="gd-yes">Yes</td></tr>
<tr><th scope="row">Negative marking (e.g. −1 per wrong answer)</th><td data-label="TestoZa" class="gd-us gd-yes">Any value, per question</td><td data-label="Google Forms" class="gd-no">Not built in</td><td data-label="Moodle" class="gd-part">Possible, set per answer option</td></tr>
<tr><th scope="row">Keep students inside the test</th><td data-label="TestoZa" class="gd-us gd-yes">Full screen and tab-switch limits (paid plans)</td><td data-label="Google Forms" class="gd-part">Locked mode on managed Chromebooks only</td><td data-label="Moodle" class="gd-part">Through quiz settings and Safe Exam Browser</td></tr>
<tr><th scope="row">Exam-style screen (palette, sections)</th><td data-label="TestoZa" class="gd-us gd-yes">Yes</td><td data-label="Google Forms" class="gd-no">No, a form in pages</td><td data-label="Moodle" class="gd-yes">Yes</td></tr>
<tr><th scope="row">Old paper from photos, exactly as printed</th><td data-label="TestoZa" class="gd-us gd-yes">Yes (Extract mode)</td><td data-label="Google Forms" class="gd-no">No</td><td data-label="Moodle" class="gd-no">No</td></tr>
<tr><th scope="row">Hosting and setup</th><td data-label="TestoZa" class="gd-us gd-yes">None, share a link</td><td data-label="Google Forms" class="gd-yes">None</td><td data-label="Moodle" class="gd-part">You host and maintain it</td></tr>
<tr><th scope="row">Cost to start</th><td data-label="TestoZa" class="gd-us gd-yes">Free</td><td data-label="Google Forms" class="gd-yes">Free</td><td data-label="Moodle" class="gd-part">Free software, paid hosting</td></tr>
</tbody>
</table>
</div>
<p class="gd-note">Based on each product's own help pages in September 2026 (listed under Sources). Products change, so check before you decide.</p>
<p>So when is something else the right call? If your school lives in Google Workspace and the quiz is low stakes, stay with Forms. If you're a university with an IT team and Moodle already running, use its quiz module. If you need exam-pattern mocks without an IT team, or you're a student practising on your own, that's exactly the gap TestoZa was built to fill. There's a longer <a href="/compare/google-forms-alternative">TestoZa vs Google Forms</a> comparison if that's your main question.</p>
`),
                ],
            },
            {
                id: 'before-you-choose',
                title: 'Five checks before you trust any platform with an exam',
                tocLabel: 'Test it',
                kicker: 'Try before you commit',
                blocks: [
                    html(`
<ol class="gd-checks">
<li>Take your own test on the cheapest phone in the house, on mobile data.</li>
<li>Switch apps halfway through and turn Wi-Fi off for thirty seconds. Watch what the platform does.</li>
<li>Get a question wrong on purpose and check the score follows your marking scheme to the decimal.</li>
<li>Look at the results as a student, then as the teacher. Would either of you learn anything?</li>
<li>Read the pricing for the day you have three hundred students, not the day you have thirty.</li>
</ol>
<p>We'd honestly rather you ran these checks on TestoZa than took our word for any of it. It takes about ten minutes.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'What is the best online test platform for teachers?',
                a: 'The best one runs your exam pattern without workarounds. For Indian school and entrance-exam patterns, look for a countdown timer, negative marking, section rules, limits on switching tabs and good support for phones. TestoZa covers all of these and is free to start. Google Forms is fine for quick, low-stakes quizzes.',
            },
            {
                q: 'Is TestoZa free?',
                a: 'Yes. You can create tests, generate questions with AI, share test links, run live exams and see results for free. Paid weekly, monthly and yearly plans add exam-security rules, scheduling, start forms, institute branding and Excel export.',
            },
            {
                q: 'Can students use TestoZa to practise on their own?',
                a: 'Yes. Sign in for free, open the AI test generator, and upload or photograph your textbook pages or an old question paper. Choose Extract to keep a paper’s questions as they are or Generate for new questions, set a timer and marking, keep the test private, and take it like the real exam. The results page shows accuracy, time per question and weak topics.',
            },
            {
                q: 'Can I make a test from a photo of a textbook or question paper?',
                a: 'Yes. In the AI test generator you can upload photos or take them with your phone camera, along with PDFs, Word and PowerPoint files. Extract copies an existing paper’s questions, options and diagrams; Generate writes new questions from the pages. Clear, flat, well-lit photos give the best results.',
            },
            {
                q: 'Do students need an app or an account to take a test?',
                a: 'No app is needed. Tests open in any modern browser on a phone, tablet or laptop. An account is optional unless the teacher requires sign-in; signing in lets students keep their results in their history.',
            },
            {
                q: 'Does TestoZa support negative marking and numerical questions?',
                a: 'Yes. Each question can have its own marks and negative marks, such as −0.25, −0.33 or −1. Question types include single-correct and multi-correct MCQs, numerical answers and comprehension passages.',
            },
            {
                q: 'How does TestoZa reduce cheating in online exams?',
                a: 'In exam mode you can force full screen, count tab switches and auto-submit after a limit you set, block copy and paste, and shuffle questions, with every warning logged. These controls are part of the paid plans. No browser-based test can rule out cheating completely, but these rules remove the easy options.',
            },
            {
                q: 'Can I create tests in Hindi?',
                a: 'Yes. The AI generator can write questions in English, in Hindi, or in both for a bilingual paper.',
            },
            {
                q: 'What happens if the internet drops during a test?',
                a: 'The student’s progress is kept on their device as they answer, and the test shows an indicator when the connection drops and when it comes back, so they can carry on once they are online again.',
            },
        ],

        closing: [
            html(`
<p>If you've read this far, you know what to look for. The quickest way to judge TestoZa is to make one real test with it. Pick the door that fits you:</p>
<div class="gd-paths">
<a class="gd-path" href="/generate-with-ai"><span class="gd-path-who">I teach</span><span class="gd-path-what">Make a test from my chapter or old paper</span></a>
<a class="gd-path" href="/online-test-for-coaching"><span class="gd-path-who">I run a coaching institute</span><span class="gd-path-what">Set up locked-down mocks for my batches</span></a>
<a class="gd-path" href="/generate-with-ai"><span class="gd-path-who">I'm a student</span><span class="gd-path-what">Turn a textbook photo into a timed mock</span></a>
</div>
<p>Also worth a look: <a href="/online-proctoring-software">exam security on TestoZa</a>, <a href="/youtube-to-quiz">YouTube to quiz</a>, <a href="/exam-software-for-schools">TestoZa for schools</a> and the full <a href="/user-guide">user guide</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Google Forms',
                links: [
                    { label: 'Use locked mode for quizzes', href: 'https://support.google.com/docs/answer/7634943' },
                    { label: 'Form Timer add-on (Google Workspace Marketplace)', href: 'https://workspace.google.com/marketplace/app/form_timer/620454808595' },
                    { label: 'Negative marking question (Docs Editors Community)', href: 'https://support.google.com/docs/thread/49015879' },
                ],
            },
            {
                label: 'Microsoft Forms',
                links: [
                    {
                        label: 'Set a timer for forms or quizzes',
                        href: 'https://support.microsoft.com/en-us/office/set-a-timer-for-forms-or-quizzes-in-microsoft-forms-f9d3d391-55d0-4c06-a004-320c92c8c091',
                    },
                ],
            },
            {
                label: 'Moodle',
                links: [
                    { label: 'Multiple Choice question type', href: 'https://docs.moodle.org/502/en/Multiple_Choice_question_type' },
                    { label: 'Safe Exam Browser', href: 'https://docs.moodle.org/502/en/Safe_Exam_Browser' },
                ],
            },
            {
                label: 'Wayground (formerly Quizizz)',
                links: [
                    {
                        label: 'Quizizz is now Wayground',
                        href: 'https://help.wayground.com/support/solutions/articles/158000403867-quizizz-is-now-wayground-what-s-changing-and-what-s-not',
                    },
                ],
            },
            {
                label: 'ClassMarker',
                links: [{ label: 'Pricing', href: 'https://www.classmarker.com/online-testing/price/' }],
            },
        ],
    },
};
