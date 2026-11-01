/**
 * testoza.com/mobile-friendly-online-exam — what a mobile-friendly online exam has to do,
 * how TestoZa's exam screen behaves on a phone, what happens when real life interrupts,
 * and how to run one for a batch. Written for teachers and coaching institutes whose
 * candidates write on their own phones.
 *
 * Product facts: see the header of howtoData.ts (checked against the code, 13 October
 * 2026). Not in the product, and never to be implied: an offline mode (a paper needs a
 * connection to start and to submit), a native app, camera or microphone proctoring,
 * full screen on iPhone, page-weight or data-usage figures (never measured).
 */
import { HOWTO_PAGES } from './howtoData';
import { compareFallback, scenariosFallback, stepsFallback } from './howtoFallback';
import { MOBILE_EXAM_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const P = HOWTO_PAGES.mobile;

export const MOBILE_FRIENDLY_ONLINE_EXAM: Guide = {
    meta: MOBILE_EXAM_META,
    body: {
        intro: [
            html(`
<p>Ask a coaching institute in India what device its students will use for an online test and the honest answer is almost always the same: their own phone. Usually an Android, often a few years old, often shared with a parent, running on mobile data that comes and goes.</p>
<p>That makes every online exam a phone exam, whether the software was designed for one or not. Most of the problems teachers report after their first online test — “half the batch couldn’t log in”, “the timer froze”, “a student lost everything when her phone died”, “the options were too small to tap” — are not problems with the students. They are problems with software that was designed for a laptop and only tolerates a phone.</p>
<p>This guide is about the difference. It sets out what “mobile-friendly” has to mean for an exam rather than a website, shows what the candidate actually sees on a six-inch screen, walks through what happens when a call comes in or the signal drops in the middle of a paper, and ends with how to run your first phone exam for a batch — and what a browser exam on a phone still cannot do.</p>
`),
        ],

        answer:
            'A mobile-friendly online exam is one a candidate can start, write and finish on their own phone without installing anything, and without losing work when real life interrupts. In practice that means: joining with a code in an ordinary browser, one question at a time at a readable size, navigation within thumb reach, answers kept on the phone and saved to the server every few seconds, the ability to carry on from another device if a phone dies, a clock that belongs to the exam rather than the phone, rules that work in a phone’s browser, and a paper that submits itself when time is up. TestoZa’s exam screen is built that way: candidates open testoza.com/join, type a six-digit code and their name or roll number, and write; on a live exam answers reach the server every 20 seconds, and building and running tests is free.',

        sections: [
            {
                id: 'on-phones',
                title: 'Your online exam is a phone exam',
                tocLabel: 'It’s a phone exam',
                kicker: 'Start here',
                blocks: [
                    html(`
<p>It is worth saying plainly, because a lot of exam software still behaves as if it were not true: most candidates in an Indian classroom, coaching batch or test series will take your online test on a phone.</p>
<p>Laptops exist, but they belong to the family rather than the student, and they are rarely free at 10 a.m. on a Sunday. Computer labs exist too, and for a full-length JEE or NEET mock a lab is still the closest thing to the real centre. But the weekly test, the chapter test, the practice paper and the doubt-clearing quiz are written on the phone in the student’s pocket. If your software is awkward there, it is awkward for nearly everybody.</p>
<h3>What a “phone” means in practice</h3>
<p>Not the newest iPhone. Plan for the median candidate instead:</p>
<ul class="al-list">
<li><strong>An Android phone a few years old,</strong> with a screen around six inches, limited memory and a browser that may not have been updated.</li>
<li><strong>Mobile data, not Wi-Fi.</strong> Signal that is fine in one room and gone in the next, and a data pack that runs low at the end of the month.</li>
<li><strong>A phone that is also a phone.</strong> Calls, WhatsApp, notifications, a battery that was at 30% when the exam started.</li>
<li><strong>Sometimes a shared phone,</strong> which means the student may not be signed in to anything, and may need to hand it back afterwards.</li>
</ul>
<p>None of this is unusual, and none of it is the student’s fault. An exam that is “mobile-friendly” is one that treats all four as normal conditions rather than as edge cases to apologise for afterwards.</p>
`),
                ],
            },
            {
                id: 'what-it-means',
                title: 'What “mobile-friendly” has to mean for an exam',
                tocLabel: 'What it has to mean',
                kicker: 'The checklist',
                blocks: [
                    html(`
<p>For an ordinary website, “mobile-friendly” means the text fits the screen and the buttons are big enough to tap. An exam has to clear a much higher bar, because a candidate cannot simply come back later, and because a lost answer has a cost in marks. These are the eight tests worth holding any exam software to:</p>
<ul class="al-checks">
<li><strong>Nothing to install.</strong> The exam opens in the browser the phone already has. Every app download, every lockdown browser and every “update required” screen loses candidates before question 1.</li>
<li><strong>No account to remember.</strong> A code and a name or roll number are enough to identify a candidate for a sitting. Passwords are forgotten precisely on exam mornings.</li>
<li><strong>One question at a time, at a readable size.</strong> Not a desktop page shrunk to fit. Text large enough to read without pinching, with a way to make it larger for a long passage.</li>
<li><strong>Navigation within thumb reach.</strong> Next, Back and Mark for review along the bottom of the screen, where the thumb already is; the question palette available on demand and out of the way otherwise.</li>
<li><strong>Answers that survive a dropped connection.</strong> Kept on the phone while the signal is gone and sent to the server as soon as it is back, with the candidate told what is happening.</li>
<li><strong>A paper that survives a dead phone.</strong> The candidate can carry on from another device, with their answers and the time that is left — and you can see that they did.</li>
<li><strong>A clock that belongs to the exam.</strong> Locking the phone, reloading the page or changing device must not pause, reset or extend the time. The paper submits itself when the time is up.</li>
<li><strong>Rules that work in a phone’s browser.</strong> Leaving the exam screen noticed and counted; full screen where the browser allows it; nothing that only works on a locked-down laptop.</li>
</ul>
<p>The rest of this guide goes through each of these on TestoZa’s exam screen, with the parts that are not possible in a phone browser marked as such.</p>
`),
                ],
            },
            {
                id: 'the-screen',
                title: 'The exam screen on a six-inch phone',
                tocLabel: 'The exam screen',
                kicker: 'What candidates see',
                blocks: [
                    html(`
<p>A candidate’s first five seconds on the exam screen decide whether they spend the next hour on your questions or on the interface. This is what TestoZa shows on a phone, from top to bottom.</p>
<h3>Getting in</h3>
<p>For a live exam the candidate opens <a href="/join">testoza.com/join</a> (or scans the QR code you project), types the six-digit code and checks in the way you chose: their name, their roll number, or their roll number and a four-digit PIN from a printed slip. They wait in a lobby until you press Start or the start time arrives. There is no app, no sign-up and no password. For a test shared as a link, they tap the link and type their name, unless you switched on “candidates must sign in” for that test.</p>
<h3>The top bar</h3>
<p>The countdown, always visible. A small dot that shows the connection: green when the phone is online, red with the words “No internet — answers saved locally” when it is not. If you turned on exam rules, the warnings so far against your limit. And a quiet text-size control, so a student reading a long comprehension passage on a small screen can make the text larger without pinching the whole page.</p>
<h3>The question</h3>
<p>One question at a time. Text starts at 18 pixels, which is comfortable on a phone held at reading distance. Options are full-width rows that are easy to hit with a thumb, rather than tiny radio buttons. Equations are typeset by the page itself rather than pasted as pictures, so they stay sharp when the text is enlarged, and diagrams are shown at the width of the screen. Numerical questions bring up an on-screen keypad, the way NTA’s screen does. Multiple-correct options look different from single-correct ones, so a candidate can tell at a glance which kind of question they are on.</p>
<h3>The bottom bar</h3>
<p>Back, Clear, Mark for review and Save &amp; Next, along the bottom edge. On a phone the row is trimmed so it fits on one line — the laptop’s two review buttons become one — because a row of buttons that wraps onto two lines is a row of buttons that gets mis-tapped.</p>
<h3>The question palette</h3>
<p>On a laptop the palette sits on the right of the screen. On a phone it would eat a third of the width, so it waits behind a <strong>Questions</strong> button at the edge of the screen and slides in as a panel when tapped, with the colour legend above the numbers. Tapping a number jumps to that question and closes the panel. Sections appear as tabs, and on a paper with timed sections, sections that have closed stay closed.</p>
<p class="al-note">The single most useful thing a teacher can do before an exam is open the paper on their own phone and read every question the way a candidate will. Anything that needs pinching, sideways scrolling or a second look is worth fixing before the batch sees it.</p>
`),
                ],
            },
            {
                id: 'what-happens',
                title: 'What happens when real life interrupts',
                tocLabel: 'When things go wrong',
                kicker: 'Phones in the wild',
                blocks: [
                    html(`
<p>In a batch of forty, something always happens to someone. The question is not whether, but what the software does when it does. Pick a situation to see what the candidate sees, what you see in the exam room, and the one line worth telling the batch beforehand:</p>
`),
                    { type: 'widget', widget: 'hw-scenarios', fallbackHtml: scenariosFallback(P) },
                    html(`
<p>Two design decisions sit underneath every one of those answers.</p>
<p><strong>The clock is the exam’s, not the phone’s.</strong> On a live exam, each candidate’s deadline is kept on the server: their own start time plus the paper’s duration, plus any extra minutes you give them, and never later than the exam’s closing time. Locking the phone, reloading the page or picking up a different device changes nothing about it. That is what makes the time fair, and it is also what lets a candidate change phones without gaining or losing a minute.</p>
<p><strong>Answers live in two places.</strong> While a candidate writes, their answers are kept on the phone and sent to the server with a regular save — every 20 seconds on a live exam, and immediately when the page comes back into view. If the signal goes, the phone keeps them until it can send them. If the phone dies, the server has everything up to the last save. Neither alone would be enough; together they mean the worst case is about twenty seconds of work.</p>
`),
                ],
            },
            {
                id: 'side-by-side',
                title: 'Desktop-first exam software against a phone-first exam',
                tocLabel: 'Side by side',
                kicker: 'Side by side',
                blocks: [
                    html(`
<p>Plenty of exam software works on a phone in the narrow sense that the page loads. The difference shows up in five places:</p>
`),
                    { type: 'widget', widget: 'hw-compare', fallbackHtml: compareFallback(P) },
                    html(`
<p>If you are evaluating software, the quickest test is the one your students will run without meaning to: start a sample paper on a cheap Android phone on mobile data, answer five questions, switch the phone to flight mode, answer two more, switch it back, lock the screen for a minute, then try to carry on from a second phone. Software built for phones gets through that in a minute without drama. Software that only tolerates them usually fails at one of those steps, and it is better to find out on your desk than in your batch.</p>
`),
                ],
            },
            {
                id: 'rules',
                title: 'Exam rules on a phone: what works and what doesn’t',
                tocLabel: 'Exam rules on phones',
                kicker: 'Fairness',
                blocks: [
                    html(`
<p>The usual objection to phone exams is cheating, and it deserves a straight answer rather than a sales pitch. A browser on a phone can do some things well, some things partly, and some things not at all.</p>
<h3>What works</h3>
<ul class="al-checks">
<li><strong>Noticing when the exam leaves the screen.</strong> Switching to WhatsApp, opening another tab, going to the home screen: the browser reports that the exam page is no longer visible. With tab-switch rules on, each time is counted against a limit you set, the candidate sees a warning with the count, and at the limit the paper submits itself. Your exam room shows the count on each candidate’s row.</li>
<li><strong>Full screen on Android.</strong> Where the browser supports it, the exam can require full screen and treat leaving it as a warning.</li>
<li><strong>Copy, paste and right-click off,</strong> so questions are harder to lift into a search box or an AI chat.</li>
<li><strong>One device per seat.</strong> A candidate can only be in a live exam on one device at a time; joining from a second device signs out the first and shows “Changed device” in your exam room. A friend can’t quietly sit the same seat in parallel.</li>
<li><strong>Knowing who is who.</strong> With a batch list attached, only names or roll numbers on the list get in, and with roll number plus PIN, a candidate also needs the PIN from their own slip.</li>
</ul>
<h3>What works partly</h3>
<ul class="al-list">
<li><strong>iPhone.</strong> Safari on iPhone cannot put a web page in full screen at all. Rather than trap iPhone candidates behind a “return to full screen” warning they can never clear, TestoZa skips the full-screen rule there. Leaving the exam screen is still noticed and counted.</li>
<li><strong>Locked screens and calls.</strong> If you count switches, a locked screen or a call that takes over the display counts too. That is fair if you have told the batch in advance, and unfair if you haven’t, which is why the instruction “keep the screen on, turn on Do Not Disturb” belongs in the message you send.</li>
</ul>
<h3>What no browser can do</h3>
<ul class="al-limits">
<li><strong>Stop a second device.</strong> A brother’s phone on the desk, a textbook on the floor. Nothing that runs inside one phone’s browser can see another phone.</li>
<li><strong>Stop screenshots</strong> on most phones.</li>
<li><strong>Watch the candidate.</strong> TestoZa does not use the camera or the microphone. Recorded proctoring needs software installed on the device, which brings back every problem in the first half of this guide.</li>
</ul>
<p>The honest summary: a phone exam with rules switched on is a strong deterrent and a weak guarantee. That is enough for weekly tests, chapter tests and most practice mocks, especially when the result is for the student’s own benefit. For the paper that decides something important — a scholarship, a batch change, a selection — run it in a room you can see, on the same software, with the projector showing the code and the names as candidates join. There is a full guide on <a href="/prevent-cheating-in-online-exams">preventing cheating in online exams</a> if you want to go further.</p>
`),
                ],
            },
            {
                id: 'questions',
                title: 'Writing questions that read well on a small screen',
                tocLabel: 'Questions for phones',
                kicker: 'For the paper-setter',
                blocks: [
                    html(`
<p>Most of what makes a test hard to take on a phone is not the software. It is the paper, written for an A4 sheet and moved online unchanged. Eight habits fix most of it:</p>
<ol class="al-list al-list--num">
<li><strong>Keep options short.</strong> Four one-line options fit on one screen with the question. Four three-line options push the last one out of sight, and a candidate who never scrolls never sees option D.</li>
<li><strong>Put the question before the data.</strong> “Which of the following is correct?” at the end of a long stem makes the candidate scroll up and down. Ask first, then give the information.</li>
<li><strong>Make diagrams wide, not tall.</strong> A phone shows width well and height badly. Crop images to the part that matters, and avoid “see the figure above” across two questions.</li>
<li><strong>Prefer typed equations to photos of equations.</strong> Typeset maths stays sharp when a candidate enlarges the text; a photo of handwriting blurs. The builder’s maths keyboard and the AI import both produce typed equations.</li>
<li><strong>Break up long passages.</strong> A comprehension passage of 400 words is fine; a passage of 1,200 words on a phone is a test of scrolling. Use the Passage question type, which groups the passage with the questions on it.</li>
<li><strong>Avoid tables wider than the screen.</strong> Matching lists work best as two short columns; a seven-column data table belongs in a lab mock, not a phone test.</li>
<li><strong>Use the right question type.</strong> A numerical answer as a typed number with a range, not four guessable options. Multiple-correct as multiple-correct, with partial marks if your exam gives them.</li>
<li><strong>Read the paper on a phone before anyone else does.</strong> Every question, once. It takes ten minutes for a weekly test and catches nearly everything above.</li>
</ol>
<p>If your questions already exist as a PDF or as photos of printed pages, the <a href="/ai-test-generator">AI test generator</a> reads them into a test — questions, options, the answer key, diagrams and equations — and the review screen shows each question as it will appear, so most of this check happens as part of the import.</p>
`),
                ],
            },
            {
                id: 'run-it',
                title: 'Running your first phone exam for a batch',
                tocLabel: 'Running one',
                kicker: 'Step by step',
                blocks: [
                    html(`
<p>The first phone exam is mostly about removing surprises: for you, and for forty students who have never seen your test screen before. This is the whole job:</p>
`),
                    { type: 'widget', widget: 'hw-steps', fallbackHtml: stepsFallback(P) },
                    html(`
<h3>What to send the batch the evening before</h3>
<p>The invitation TestoZa writes says which test it is, how long it takes, where to go, the code and how to check in. Add three lines of your own, because they prevent nearly every problem in the “what happens when” list above:</p>
<ul class="al-list">
<li><strong>Charge your phone</strong> to at least half before the exam, or keep the charger nearby.</li>
<li><strong>Turn on Do Not Disturb.</strong> Calls and notifications take the exam off the screen, and leaving the exam screen is counted.</li>
<li><strong>If anything goes wrong, don’t panic and don’t close the tab.</strong> Answers are saved. If the phone dies, join again on any device with the same details and carry on.</li>
</ul>
<p>There is more on writing that message, and on sending results back to the group afterwards, in the guide to <a href="/share-test-on-whatsapp">sharing a test on WhatsApp</a>.</p>
<h3>During the exam</h3>
<p>The exam room shows every candidate as a row: in the lobby, writing with minutes left and questions answered, or submitted, with flags for “No signal”, “Changed device” and warnings for leaving the exam screen. From there you can give one candidate five or ten extra minutes — the right answer for the student whose signal dropped for four minutes — or give everyone still writing more time if the whole building’s network stutters. Candidates see a message on their screen when you do.</p>
<h3>After it</h3>
<p>The rank list fills in as papers are submitted, with the average, highest and lowest, and every question’s numbers: how many attempted it, how many got it right, how long they spent and which wrong option they chose. Download it as Excel, print report cards, or send the rank list to the batch group.</p>
`),
                ],
            },
            {
                id: 'limits',
                title: 'What a browser exam on a phone can’t do',
                tocLabel: 'Honest limits',
                kicker: 'Being straight',
                blocks: [
                    html(`
<p>Running exams in the phone’s own browser is what makes them easy to join. It also sets limits worth knowing before you plan around them:</p>
<ul class="al-limits">
<li><strong>No offline exams.</strong> A candidate needs a connection to open the paper and to submit it. In between, answers are kept on the phone through a dropped signal, but a paper cannot be downloaded the night before and written in a village with no network.</li>
<li><strong>No native app.</strong> Everything runs in the browser. That is deliberate — an app is one more thing to install and update — but it means there is no icon on the home screen and no push notification when an exam opens. The WhatsApp message is the notification.</li>
<li><strong>No full screen on iPhone,</strong> because Safari on iPhone doesn’t allow it for web pages. Leaving the exam screen is still noticed.</li>
<li><strong>No camera or microphone proctoring.</strong> TestoZa never asks for them.</li>
<li><strong>Very old phones and browsers.</strong> A phone whose browser hasn’t been updated in years may struggle with any modern exam page. Ask candidates to update Chrome (or Safari) before the first exam, not during it.</li>
<li><strong>A small screen is still small.</strong> Long data-interpretation sets, wide tables and seven-column matching are better in a computer lab. Run the weekly tests on phones and the full-length mocks in a lab where you can.</li>
</ul>
<p>Within those limits, a phone is a perfectly good exam device for most of what an institute runs in a month. The point is to choose software that treats it as the main device rather than a fallback, and to write papers that respect the screen.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'Can students take an online exam on a mobile phone?',
                a: 'Yes. On TestoZa candidates use the browser already on their phone — Chrome, Safari or any other — with nothing to install. For a live exam they open testoza.com/join, type the six-digit code and check in with their name or roll number; for a test link they tap the link. The exam screen shows one question at a time at a readable size, with the question palette one tap away.',
            },
            {
                q: 'Do students need to install an app or create an account?',
                a: 'No app, on Android or iPhone. No account either, for a live exam or for a test link, unless you switch on “candidates must sign in” for a particular test. A code and a name or roll number identify a candidate for a sitting; with a batch list attached, only names or roll numbers on the list can join.',
            },
            {
                q: 'What happens if the internet drops during the exam?',
                a: 'The candidate keeps answering. A red dot in the top bar says “No internet — answers saved locally”, the answers stay on the phone, and they go to the server with the next save once the signal is back — every 20 seconds on a live exam. The clock keeps running, so you may want to give a few extra minutes to a candidate who lost several, which the exam room lets you do per candidate.',
            },
            {
                q: 'What if a student’s phone dies or the battery runs out?',
                a: 'They join again on any other phone, tablet or laptop with the same details and carry on from their saved answers with the time that is left. At most about 20 seconds of work is at risk on a live exam. The first device is signed out, and their row in your exam room shows “Changed device”.',
            },
            {
                q: 'Does a mobile online exam work on iPhone?',
                a: 'Yes, in Safari or Chrome, with nothing to install. One rule works differently: Safari on iPhone cannot put a web page in full screen, so the full-screen rule is skipped on iPhones rather than trapping candidates behind a warning they can’t clear. Leaving the exam screen is still noticed and counted if tab-switch rules are on.',
            },
            {
                q: 'Can students cheat by switching apps on their phone?',
                a: 'Switching apps is noticed. With tab-switch rules on, each switch away from the exam is counted against a limit you set, the candidate sees a warning, and at the limit the paper submits itself; the count shows in your exam room. What no browser exam can stop is a second device or a book on the desk, so run decisive papers in a room you can supervise.',
            },
            {
                q: 'Will the phone screen turn off during the exam?',
                a: 'On a live exam, the page asks the browser to keep the screen awake, which works in browsers that support it. Candidates should still keep the screen on themselves, because a locked screen counts as leaving the exam screen when tab-switch rules are on.',
            },
            {
                q: 'Is a phone good enough for a full-length JEE or NEET mock?',
                a: 'It works, and many students only have a phone, but a three-hour, 180-question paper is more comfortable on a bigger screen. A common rhythm is weekly and chapter tests on phones, and full-length mocks in a computer lab or on laptops when you can arrange it. The same test runs on both.',
            },
            {
                q: 'Is TestoZa free for mobile exams?',
                a: 'Building tests, running live exams, marking, rank lists and report cards are free. Paid plans — ₹49 for 7 days, ₹149 for 30 days or ₹799 for a year — add exam rules such as forced full screen and tab-switch limits, and other extras. There is no per-candidate charge.',
            },
        ],

        closingTitle: 'Run the next one on their phones',
        closing: [
            html(`
<p>Pick next week’s test and try it the way your students will, on a phone, before they do:</p>
<div class="al-paths">
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Paper already written?</span><span class="al-path-what">Upload the PDF or photos and let the AI read it</span></a>
<a class="al-path" href="/create-test" data-icon="pencil"><span class="al-path-who">Starting from scratch?</span><span class="al-path-what">Build it with short options and a real clock</span></a>
<a class="al-path" href="/user-guide/live-exam-sessions" data-icon="key"><span class="al-path-who">Running it for a batch?</span><span class="al-path-what">See how join codes and the exam room work</span></a>
</div>
<p>Related reading: <a href="/how-to-conduct-online-exam">how to conduct an online exam</a>, <a href="/prevent-cheating-in-online-exams">preventing cheating in online exams</a>, <a href="/share-test-on-whatsapp">sharing a test on WhatsApp</a>, <a href="/full-length-online-test-maker">full-length mock tests</a> and <a href="/pricing">pricing</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Browser behaviour',
                links: [
                    { label: 'Page Visibility API (MDN)', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API' },
                    { label: 'Fullscreen API (MDN)', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API' },
                    { label: 'Screen Wake Lock API (MDN)', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API' },
                ],
            },
            {
                label: 'TestoZa',
                links: [
                    { label: 'Join an exam', href: 'https://testoza.com/join' },
                    { label: 'Live exam sessions', href: 'https://testoza.com/user-guide/live-exam-sessions' },
                    { label: 'Pricing', href: 'https://testoza.com/pricing' },
                ],
            },
        ],
    },
};
