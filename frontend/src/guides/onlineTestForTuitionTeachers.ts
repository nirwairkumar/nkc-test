/**
 * testoza.com/online-test-for-tuition-teachers — weekly online tests for home tutors and
 * small tuition centres (5 to 60 students, Classes 5 to 12, school and board syllabus).
 *
 * Not the same audience as /online-test-for-coaching (an older landing page for coaching
 * institutes) or /best-online-exam-software-india (a comparison). This one is for a single
 * teacher with one or two batches, a WhatsApp group and no office.
 *
 * Facts: TestoZa behaviour as in the header of testMakerData.ts, plus share text
 * (utils/shareUtils.ts testInviteText: "No app and no account needed — just type your name"),
 * prices from the plans table (₹49 / 7 days, ₹149 / 30 days, ₹799 / year).
 */
import { TEST_MAKER_PAGES } from './testMakerData';
import { compareFallback, scenariosFallback, stepsFallback } from './howtoFallback';
import { TUITION_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const P = TEST_MAKER_PAGES.tuition;

export const ONLINE_TEST_FOR_TUITION_TEACHERS: Guide = {
    meta: TUITION_META,
    body: {
        intro: [
            html(`
<p>Most tuition in India happens in a front room, a rented hall or above a shop: one teacher, two or three batches after school, twenty students in each. The teaching is good. What usually slips is testing. Making a paper by hand takes an evening, checking forty answer sheets takes another, and by the time marks reach students they have forgotten the questions.</p>
<p>Online tests fix that for the objective part of what you teach. Students take the test on the phone they already have, it marks itself the moment they submit, and you open one screen to see who scored what. You don’t need institute software for that, or an app with your name on it. You need a way to turn this week’s chapter into a test tonight and a link your students can open.</p>
<p>This guide is for that teacher. It covers how to make a test from a textbook page in about fifteen minutes, how to send it, what to do with the results, how to keep parents informed, and what it costs. We make <a href="/">TestoZa</a>, and every step below is done in it. Where something is better done on paper, we say so.</p>
`),
        ],

        answer:
            'Tuition teachers can run weekly online tests without an app or institute software. In TestoZa, photograph the textbook exercise or upload a PDF, let the AI read the questions and answers into a test, check them, and share the link in your WhatsApp group. Students open it on their phones, type their name and start; there is no app to install and no account to create. Each student sees their marks and mistakes when they submit, and you see marks, ranks and who hasn’t taken it yet. Making tests, sharing them and seeing results cost nothing; paid plans start at ₹49 for 7 days.',

        sections: [
            {
                id: 'why-weekly',
                title: 'Why a short weekly test works better than a big monthly one',
                tocLabel: 'Why weekly',
                kicker: 'The idea',
                blocks: [
                    html(`
<p>The research on learning is unusually clear on this point. Being asked to recall something, a test, fixes it in memory better than reading it again, and recall spread over weeks beats recall crammed into one day. A twenty-question test every Saturday on that week’s chapter does more for marks than a long test at the end of the month.</p>
<p>For a tuition teacher, a weekly test also does three practical jobs:</p>
<ul class="al-list">
<li><strong>It shows you who is lost before the school exam does.</strong>A student who scores 6 out of 20 on Saturday can be helped on Monday, not after their report card.</li>
<li><strong>It gives parents a reason to stay.</strong>A family that hears about their child’s progress every week rarely moves to another tuition mid-year.</li>
<li><strong>It makes students revise.</strong>Knowing there is a test on Saturday is the most reliable revision plan a fourteen-year-old will follow.</li>
</ul>
<p>The only reason most tutors don’t test weekly is the time it takes on paper. That is the part to remove.</p>
`),
                ],
            },
            {
                id: 'paper-vs-online',
                title: 'A paper test and an online test, side by side',
                tocLabel: 'Paper or online',
                kicker: 'The difference',
                blocks: [
                    html(`
<p>Paper tests still have their place, especially for long answers and diagrams. For the objective part of a test, here is what changes when it moves to students’ phones.</p>
`),
                    { type: 'widget', widget: 'hw-compare', fallbackHtml: compareFallback(P) },
                ],
            },
            {
                id: 'make-test',
                title: 'Make a test from a textbook page in fifteen minutes',
                tocLabel: 'Make a test',
                kicker: 'Making it',
                blocks: [
                    html(`
<p>You don’t need to type questions. Most of what you would put in a test is already printed somewhere: the textbook exercise, a guide book, last year’s school paper. TestoZa’s AI reads those for you.</p>
<ol class="al-steps">
<li><strong>Photograph the page, or upload a PDF</strong>Take a clear photo of the exercise in good light, or upload a PDF of a question paper. Handwritten notes work too, if the writing is clear.</li>
<li><strong>Choose Extract or Generate</strong><em>Extract</em> copies the questions as they are printed, with their options and answers. <em>Generate</em> writes new questions from a chapter or your notes, which is useful when students already know the textbook questions by heart.</li>
<li><strong>Check every question</strong>The AI is good, not perfect. Read each question, fix a misread word, and make sure the correct answer is ticked. This is the step not to skip.</li>
<li><strong>Set time and marks</strong>Give the test a time in minutes. For school classes, keep one mark per question and no negative marking; new tests start that way.</li>
<li><strong>Choose what students type before starting</strong>Name is asked by default. Add Roll No or Class if you teach more than one batch, so results sort cleanly.</li>
</ol>
<p>Maths and science work as well as English and social studies. Equations are typed, not pasted as blurry pictures; there is a maths keyboard for fractions, powers and roots, and chemistry formulas display correctly. Numerical answers can be marked within a range, so 9.8 and 9.81 can both count. If you teach in Hindi, questions can be in Hindi, or in Hindi and English one under the other, and you can type Hindi in English letters.</p>
<p class="al-note">Tests can be multiple choice with one correct answer, multiple choice with several, a numerical answer, or a group of questions under one passage. Long written answers are not marked online, so keep those in the notebook.</p>
`),
                ],
            },
            {
                id: 'send',
                title: 'Send it on WhatsApp, or run it in class',
                tocLabel: 'Send it',
                kicker: 'Sharing',
                blocks: [
                    html(`
<p>There are two ways to give a test to students, and both work on any phone with a browser.</p>
<div class="al-table-wrap"><table class="al-table">
<thead><tr><th scope="col"></th><th scope="col">A test link</th><th scope="col">A live test with a code</th></tr></thead>
<tbody>
<tr><th scope="row">Best for</th><td data-label="A test link">Homework tests taken at home, any time this week</td><td data-label="A live test with a code">The whole batch writing together, in class or at the same time from home</td></tr>
<tr><th scope="row">How students start</th><td data-label="A test link">Tap the link in the WhatsApp group and type their name</td><td data-label="A live test with a code">Open testoza.com/join, type the six-digit code and their name or roll number</td></tr>
<tr><th scope="row">What you see</th><td data-label="A test link">Results as each student submits</td><td data-label="A live test with a code">Who has joined, who is writing, who has submitted, live</td></tr>
<tr><th scope="row">When it ends</th><td data-label="A test link">When you stop it, or at a time you schedule</td><td data-label="A live test with a code">When the time is up; papers submit themselves</td></tr>
</tbody>
</table></div>
<p>The message TestoZa writes for WhatsApp tells students exactly what to do: the test’s name, the number of questions, the minutes, the link, and “No app and no account needed — just type your name.” Students on cheap Android phones, on iPhones or on a parent’s phone all open it the same way.</p>
<p>If the signal drops during the test, answers are kept on the phone and saved when it comes back. If a phone dies in the middle of a live test, the student can join again on another phone and continue with the same answers and the time that is left.</p>
`),
                ],
            },
            {
                id: 'results',
                title: 'What to do with the results',
                tocLabel: 'Results',
                kicker: 'After the test',
                blocks: [
                    html(`
<p>Each student sees their score, the right answers and their mistakes as soon as they submit. You see the whole batch in one place: marks, a rank list, and who hasn’t taken the test yet.</p>
<p>Ten minutes with the results is worth more than an hour of re-teaching the whole chapter. Look for three things:</p>
<div class="al-cards">
<div class="al-card" data-tone="blue" data-icon="sparkles"><h3>Questions most got wrong</h3><p>Start Monday’s class with those three or four questions. They show what the class didn’t understand, not just one student.</p></div>
<div class="al-card" data-tone="orange" data-icon="pencil"><h3>Students below half marks</h3><p>A short talk, or a small test on just that topic, before the gap gets wider.</p></div>
<div class="al-card" data-tone="purple" data-icon="key"><h3>Who didn’t take it</h3><p>Missing tests are an early sign of a student drifting away. A message to the parent this week saves the admission.</p></div>
</div>
<p>For parents, TestoZa writes a WhatsApp message for each student with their marks, rank and the class average, and a separate one for students who were absent. You tap to open each message in WhatsApp and send it yourself; nothing goes out on its own. This needs the parents’ numbers in your batch list. At the end of a term you can print report cards from the results or download everything as an Excel sheet.</p>
`),
                ],
            },
            {
                id: 'situations',
                title: 'Tests for every month of the tuition year',
                tocLabel: 'Through the year',
                kicker: 'Your situation',
                blocks: [
                    html(`
<p>The weekly test is the habit. Around it, a tuition year has a few moments where a different kind of test helps. Pick yours:</p>
`),
                    { type: 'widget', widget: 'hw-scenarios', fallbackHtml: scenariosFallback(P) },
                ],
            },
            {
                id: 'first-test',
                title: 'Your first weekly test, step by step',
                tocLabel: 'First test',
                kicker: 'Checklist',
                blocks: [
                    html(`
<p>The first test takes longest. After two or three weeks the whole job takes about fifteen minutes.</p>
${stepsFallback(P)}
<p>Tell students on the first day that the test marks itself and that you will see who took it. That one sentence does more for attendance than any reminder.</p>
`),
                ],
            },
            {
                id: 'cost',
                title: 'What it costs, and what you don’t need',
                tocLabel: 'Cost',
                kicker: 'The money',
                blocks: [
                    html(`
<p>Making tests, sharing them, and seeing marks and ranks cost nothing in TestoZa, for any number of students. Paid plans are for extras:</p>
<div class="al-table-wrap"><table class="al-table">
<thead><tr><th scope="col">Plan</th><th scope="col">Price</th><th scope="col">Useful when</th></tr></thead>
<tbody>
<tr><th scope="row">Free</th><td data-label="Price">₹0</td><td data-label="Useful when">Weekly tests, links on WhatsApp, live tests with a code, results and ranks</td></tr>
<tr><th scope="row">7 days</th><td data-label="Price">₹49</td><td data-label="Useful when">An exam week, when you want exam rules such as full screen and a limit on leaving the test</td></tr>
<tr><th scope="row">30 days</th><td data-label="Price">₹149</td><td data-label="Useful when">A month of tests with your tuition’s name and logo on them, scheduling and Excel export</td></tr>
<tr><th scope="row">1 year</th><td data-label="Price">₹799</td><td data-label="Useful when">All of it, all year, for less than one student’s monthly fee in most cities</td></tr>
</tbody>
</table></div>
<p>There is no charge per student, so a batch of 15 costs the same as a batch of 60.</p>
<p>What you don’t need, whatever anyone tells you: an app published under your tuition’s name, a laptop for students, or a computer lab. Branded coaching apps make sense for institutes that sell video courses and collect fees through the app. For a teacher who teaches in person and wants to test every week, they are a lot of cost for a small job.</p>
<h3>What TestoZa doesn’t do for a tuition</h3>
<ul class="al-limits">
<li><strong>Fees, attendance and timetables.</strong> Keep using your register or a fee app for those.</li>
<li><strong>Video classes or notes for sale.</strong> TestoZa is for tests.</li>
<li><strong>Long written answers.</strong> It marks objective and numerical answers. Check written work in notebooks.</li>
<li><strong>Camera supervision.</strong> A test taken at home is on trust, with rules such as full screen and tab-switch limits on paid plans. Treat home tests as practice.</li>
</ul>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'How can a tuition teacher conduct an online test?',
                a: 'Make the test in TestoZa from a photo of the textbook page or a PDF, check the questions, then share the link in your students’ WhatsApp group. Students open it on their phones, type their name and start. For a test the whole batch writes together, start a live test and give them a six-digit code to type at testoza.com/join.',
            },
            {
                q: 'Do my students need to install an app?',
                a: 'No. Tests open in the phone’s normal browser, Chrome or Safari. Students don’t install anything and don’t create an account; they type their name, or a roll number if you ask for one.',
            },
            {
                q: 'Can I make a test from a photo of the textbook?',
                a: 'Yes. Photograph the exercise page and choose Extract to copy the questions as printed, or Generate to write new questions from the chapter. Check each question and answer before sharing, because the AI can misread a word.',
            },
            {
                q: 'Is it free for tuition teachers?',
                a: 'Making tests, sharing them and seeing results cost nothing, for any number of students. Paid plans add exam rules, your tuition’s name and logo, scheduling and Excel export: ₹49 for 7 days, ₹149 for 30 days or ₹799 a year, with no charge per student.',
            },
            {
                q: 'How do parents see their child’s marks?',
                a: 'TestoZa writes a WhatsApp message for each parent with the marks, rank and class average, and one for parents of absent students. You open each message and send it from your phone; nothing is sent automatically. You can also print report cards.',
            },
            {
                q: 'Can I make tests in Hindi?',
                a: 'Yes. Questions can be in Hindi, or in Hindi and English one under the other. You can type Hindi in English letters, and the AI can write Hindi questions from an English page.',
            },
            {
                q: 'Can students cheat in an online test at home?',
                a: 'At home, a test is partly on trust. Paid plans add rules such as full screen, a limit on leaving the test screen and copy-paste off, and shuffled questions make sharing answers harder. For tests that matter, run a live test in class, where you can see the room.',
            },
            {
                q: 'What subjects and classes does it work for?',
                a: 'Any subject with objective questions, from Class 5 to Class 12 and beyond: maths and science with equations and numerical answers, languages, and social studies. Long written answers are better checked on paper.',
            },
        ],

        closingTitle: 'Make this Saturday’s test tonight.',
        closing: [
            html(`
<p>Take the exercise you taught this week, photograph it and send the link to your group. It is the fastest way to see whether online tests suit your students.</p>
<div class="al-paths">
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Have a textbook page?</span><span class="al-path-what">Photograph it and let the AI make the test</span></a>
<a class="al-path" href="/create-test" data-icon="pencil"><span class="al-path-who">Want to type it yourself?</span><span class="al-path-what">Open the test builder</span></a>
<a class="al-path" href="/share-test-on-whatsapp" data-icon="key"><span class="al-path-who">Ready to send it?</span><span class="al-path-what">How to share a test on WhatsApp</span></a>
</div>
<p>Related reading: <a href="/cbse-online-test-maker">CBSE online test maker</a>, <a href="/hindi-online-test-maker">Hindi online test maker</a>, <a href="/math-test-maker">maths test maker</a>, <a href="/mobile-friendly-online-exam">exams on phones</a> and <a href="/guides">all guides</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Learning research',
                links: [
                    { label: 'Roediger and Karpicke (2006), test-enhanced learning', href: 'https://doi.org/10.1111/j.1467-9280.2006.01693.x' },
                    { label: 'Cepeda et al. (2006), distributed practice', href: 'https://doi.org/10.1037/0033-2909.132.3.354' },
                ],
            },
            {
                label: 'TestoZa',
                links: [
                    { label: 'Pricing', href: 'https://testoza.com/pricing' },
                    { label: 'Join a test', href: 'https://testoza.com/join' },
                    { label: 'Live exam sessions', href: 'https://testoza.com/user-guide/live-exam-sessions' },
                ],
            },
        ],
    },
};
