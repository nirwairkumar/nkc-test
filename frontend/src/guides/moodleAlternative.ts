/**
 * testoza.com/moodle-alternative — when to keep Moodle, when to move the exams, what
 * running Moodle takes, and how TestoZa handles exam day, questions, marking, phones,
 * results and switching. Written for school heads, coaching institute owners, college
 * exam cells and trainers who mostly use Moodle for quizzes.
 *
 * Moodle facts (sources in `sources`, checked 2 October 2026):
 *   - stats.moodle.org: 147,642 registered sites, 237 countries, 533,741,539 users,
 *     12,818,892,137 quiz questions; India 4,486 sites (8th).
 *   - Releases (moodledev.io): 5.2 on 20 Apr 2026 (current); 5.0 security ends 5 Oct
 *     2026; 5.1 general ends 5 Oct 2026, security 19 Apr 2027; 4.5 LTS security to
 *     4 Oct 2027; 5.3 LTS scheduled 5 Oct 2026. 5.2 needs PHP 8.3+, 64-bit, sodium,
 *     max_input_vars ≥ 5000; PostgreSQL 16 / MySQL 8.4 / MariaDB 10.11.
 *   - Installation quick guide: "intended for administrators experienced with
 *     installing web server applications"; web root is public/; cron every minute.
 *     Cron page: "Your site will not work properly without it."
 *   - Guest access: guests "cannot participate in any activities; they can only view
 *     content". Upload users: username, firstname, lastname, email required.
 *   - Import questions: GIFT, Moodle XML, Aiken, Blackboard, Cloze, Missing word, …;
 *     Word table format is a contributed plugin; no PDF import.
 *   - Multiple choice: negative percentages allowed; single-answer negative only with
 *     Deferred feedback; multiple-answer totals below zero become zero. Allowed grades:
 *     moodleData.ts (from question/engine/bank.php).
 *   - AI: subsystem since 4.5; placements are the text editor (generate text, image)
 *     and course assistance (summarise, explain); providers Azure AI, Amazon Bedrock
 *     and Gemini (new in 5.2), DeepSeek, Ollama, OpenAI, each with its own account/key.
 *     Question generation only through directory plugins.
 *   - Safe Exam Browser: Windows, macOS, iOS; must be installed on the device.
 *   - Moodle app offline quizzes: no time limit, deferred feedback, sequential
 *     navigation (4.3.1+), no network restriction.
 *   - MoodleCloud: plans in moodleData.ts; no plugins or integrations; 28-day trial.
 *   - Statcounter, India, September 2026: Android 93.89 %, iOS 6.05 % of mobile.
 *
 * TestoZa claims checked against the code on 2 October 2026:
 *   - Join codes (pages/join/JoinPage.tsx, backend routers/join.py, exam_sessions.py):
 *     6-digit code at testoza.com/join or QR; check-in by name, roll number, or roll +
 *     4-digit PIN; lobby; manual or timed start; late entry; per-candidate deadline is
 *     the earlier of own start + duration + extra and closing time + extra; heartbeat
 *     saves answers every 20 s; rejoin on another device ("Changed device"); papers
 *     submit themselves when time runs out; End exam submits drafts.
 *   - Exam room (pages/exams/ExamSessionPage.tsx, components/exams/MonitorPanel.tsx,
 *     ResultsPanel.tsx, ExamPresentPage.tsx, RetestSheet.tsx, ReportCardsPage.tsx):
 *     Start, More time (+5/10/15/30 for everyone writing), per-candidate +5/+10,
 *     submit now, remove; projector view; rank list (copy, WhatsApp, Excel); class
 *     average by section; report cards (print / PDF); parent and absentee WhatsApp
 *     messages (wa.me, nothing sent automatically); results on end / immediately /
 *     manually; answer key never sent to session candidates.
 *   - Batches (components/exams/AddStudentsSheet.tsx): paste from Excel or WhatsApp,
 *     upload a sheet, or type one; roll number, name, parent's phone (optional).
 *   - Marks (components/test-builder/QuestionCard.tsx, backend services/scoring.py):
 *     Marks and Wrong on every question card, new questions copy the previous one's;
 *     multiple-correct: proportional (or JEE Advanced +1 per option) partial marks,
 *     negative if any wrong option;
 *     numerical answers as a min–max range; scored on the server.
 *   - Question types in the builder: single, multiple, numerical, comprehension.
 *   - AI import accepts PDF, PNG, JPG, WEBP (backend routers/ai.py valid_extensions).
 *   - Exam rules (components/TestSettingsPanel.tsx): force full screen, tab-switch
 *     detection, violation limit with auto-submit, copy/paste and right-click off,
 *     back button blocked.
 *   - Prices: plans table (₹49 / 7 days, ₹149 / 30 days, ₹799 / 365 days).
 *   - NOT in the product: LTI, GIFT / Moodle XML import or export, essays, file
 *     uploads, a course gradebook. Don't claim them.
 */
import { MOODLE_META } from './meta';
import { MARKING_PRESETS, MOODLECLOUD_PLANS, MOODLE_RELEASES, longDate, moodleMatch, moodlePercent, rupees } from './moodleData';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const AUDIT_FALLBACK = `
<p>A checklist of what institutes open Moodle for: courses and lesson pages; assignments with file uploads or essays; forums and messages; SCORM or H5P packages; completion tracking and certificates; a gradebook that adds up a whole term; selling courses; weekly tests; full mock exams in a hall or lab; practice tests at home. If any of the first seven are in daily use, keep Moodle. If tests are the main use alongside one or two of them, keep Moodle for teaching and move the tests. If tests are almost all you use, you are running an LMS for one module, and a dedicated exam platform is simpler.</p>`;

const SUPPORT_FALLBACK = `
<table><thead><tr><th>Moodle version</th><th>Released</th><th>Bug fixes until</th><th>Security fixes until</th></tr></thead><tbody>
${MOODLE_RELEASES.map((r) => `<tr><td>${r.version}${r.lts ? ' (long-term support)' : ''}</td><td>${longDate(r.released)}</td><td>${longDate(r.general)}</td><td>${longDate(r.security)}</td></tr>`).join('\n')}
</tbody></table>
<p>Moodle 5.3, the next long-term support release, is scheduled for 5 October 2026.</p>`;

const EXAM_ROOM_FALLBACK = `
<p>A replica of TestoZa’s exam room for a live exam: “Class 10 · Science Test 14” for batch 10-B, 30 questions in 45 minutes, joined with the code 482 913 at testoza.com/join. The teacher sees the code with copy, WhatsApp and projector buttons and a QR code; a bar showing how many candidates are in the lobby with a “Start exam now” button; and a live list of candidates, each marked in the lobby, writing with minutes left and questions answered, submitted, or flagged (no signal, changed device, warnings for leaving the exam screen). Each row has +5 minutes, +10 minutes, submit their exam now and remove. “More time” gives everyone still writing 5, 10, 15 or 30 minutes. “End exam” submits the saved answers of anyone still writing, and the results tab shows the rank list, average, highest and lowest marks, with buttons to release results, copy the rank list, send it on WhatsApp, download Excel and print report cards. A projector view shows the code, a QR code, the names of candidates as they join and the countdown.</p>`;

const MARKING_FALLBACK = `
<table><thead><tr><th>Exam</th><th>Right</th><th>Wrong</th><th>Moodle answer grade for a wrong option</th></tr></thead><tbody>
${MARKING_PRESETS.map((p) => {
    const m = moodleMatch(p.right, p.wrong);
    const grade = p.wrong === 0 ? 'None (0%)' : `−${moodlePercent(m.fraction)}${m.exact ? '' : ` (gives −${m.penalty.toFixed(2)}, not −${p.wrong})`}`;
    return `<tr><td>${p.label}</td><td>+${p.right}</td><td>${p.wrong === 0 ? '0' : `−${p.wrong}`}</td><td>${grade}</td></tr>`;
}).join('\n')}
</tbody></table>
<p>In Moodle, a single-answer question only applies a negative grade when the quiz uses the Deferred feedback behaviour. In TestoZa, the same scheme is two numbers on the question card: Marks and Wrong.</p>`;

const PRICE_ROWS = MOODLECLOUD_PLANS.map(
    (p) => `<tr><th scope="row">${p.name}</th><td data-label="Users">${p.users}</td><td data-label="Storage">${p.storage}</td><td data-label="Per year">${rupees(p.rupees)}</td></tr>`,
).join('\n');

export const MOODLE_ALTERNATIVE: Guide = {
    meta: MOODLE_META,
    body: {
        intro: [
            html(`
<p>Moodle has earned its reputation. It is free, open-source and mature, and its own statistics count 147,642 registered sites in 237 countries, with more than 533 million user accounts and 12.8 billion quiz questions between them. India has 4,486 registered sites, the eighth most of any country, and registration is optional, so the real number is higher.</p>
<p>The searches for a Moodle alternative usually start with something smaller and more annoying. The person who set up the server has left. A PHP upgrade broke a plugin the week before exams. Three hundred students need accounts, and on test day thirty have forgotten their passwords. A teacher spends an evening typing thirty questions into forms, one at a time. The lockdown browser won’t install on the students’ Android phones. None of this is a failure of Moodle’s quiz, which is very good. It is the cost of running a whole learning management system when what you mostly need is to set a test, run it fairly and get the marks out.</p>
<p>This guide is for the people weighing that cost: school heads, coaching institute owners, college exam cells and trainers. It starts with what you actually use Moodle for, because switching makes no sense if you teach inside it. Then it puts self-hosted Moodle, MoodleCloud and TestoZa side by side and walks through exam day, getting questions in, negative marking, phones, results and switching, with Moodle’s own documentation as the source for every Moodle fact. It also says plainly where Moodle is the better tool. Further down there’s a working exam room: start a test, give a candidate more time, then end it.</p>
`),
        ],

        answer:
            'Pick a Moodle alternative by what you use Moodle for. If you rely on courses, assignments, forums, SCORM and a term gradebook, keep Moodle or move to another full LMS such as Canvas or Open edX, and fix the hosting instead, for example with MoodleCloud, which starts at ₹15,340 a year for 50 users. If you mainly use Moodle’s quiz for tests and exams, a dedicated exam platform removes most of the work: no server, no plugins and no account for every student. TestoZa is one. AI turns PDFs and photos of question papers into tests, candidates join live exams at testoza.com/join with a six-digit code and a roll number, negative marking such as +4/−1 is two numbers on each question, and rank lists and report cards are ready as papers come in. Building and running tests is free; paid plans start at ₹49 a week. It is not an LMS: no courses, essays or term gradebook, and no LTI link into Moodle.',

        sections: [
            {
                id: 'what-you-use',
                title: 'Start with what you actually use Moodle for',
                tocLabel: 'What you use',
                kicker: 'Start here',
                blocks: [
                    html(`
<p>Moodle is a learning management system, an LMS: a whole online school with courses, lessons, assignments, forums, grades and certificates, and, inside all of that, a quiz. So “Moodle alternative” can mean a replacement for any of it. Before comparing tools, list what your institute opens Moodle for in a normal week. Tick what you’d miss:</p>
`),
                    { type: 'widget', widget: 'moodle-audit', fallbackHtml: AUDIT_FALLBACK },
                    html(`
<p>Most institutes land on one of three answers:</p>
<ul class="ma-list">
<li><strong>Keep Moodle.</strong> If courses, assignments with uploaded files or essays, forums, SCORM packages, completion tracking and a gradebook that adds up a term are in daily use, you’re running an LMS, and an exam tool can’t replace it. Fix what hurts instead: managed hosting, fewer plugins, a Moodle Partner for upgrades.</li>
<li><strong>Keep Moodle, move the exams.</strong> Common in schools and colleges. Lessons and assignments stay in Moodle; weekly tests, mocks and entrance-style exams move to a tool built for them. Students follow a link from the course page, and marks come back as a spreadsheet.</li>
<li><strong>Switch.</strong> Plenty of coaching institutes and training centres use Moodle almost only for quizzes. For them the LMS is overhead: a server, upgrades and an account for every student, in exchange for one module.</li>
</ul>
<p>The rest of this guide is mostly about the second and third cases.</p>
`),
                ],
            },
            {
                id: 'at-a-glance',
                title: 'Moodle, MoodleCloud and TestoZa at a glance',
                tocLabel: 'At a glance',
                kicker: 'Side by side',
                blocks: [
                    html(`
<p>For someone who mainly runs tests, there are three realistic options: Moodle on your own server, Moodle hosted by Moodle HQ (MoodleCloud), or an exam platform such as TestoZa. Prices were checked on 2 October 2026.</p>
<div class="ma-table-wrap ma-table-wrap--wide"><table class="ma-table ma-table--glance">
<thead><tr><th scope="col">What matters</th><th scope="col">Moodle, self-hosted</th><th scope="col">MoodleCloud</th><th scope="col" class="ma-us">TestoZa</th></tr></thead>
<tbody>
<tr><th scope="row">What you pay</th><td data-label="Self-hosted">Nothing for the software. A server, backups and an administrator’s time.</td><td data-label="MoodleCloud">${rupees(MOODLECLOUD_PLANS[0].rupees)} a year for 50 users, up to ${rupees(MOODLECLOUD_PLANS[4].rupees)} for 750.</td><td data-label="TestoZa" class="ma-us">Free to build and run tests. Paid plans ₹49 a week, ₹149 a month or ₹799 a year.</td></tr>
<tr><th scope="row">Installing and upgrading</th><td data-label="Self-hosted">You: PHP 8.3+, a database, a cron job every minute, two major versions a year.</td><td data-label="MoodleCloud">Moodle HQ.</td><td data-label="TestoZa" class="ma-us">Nothing to install. Open it in a browser.</td></tr>
<tr><th scope="row">Plugins</th><td data-label="Self-hosted">Any from the directory, if they support your version.</td><td data-label="MoodleCloud">None can be installed.</td><td data-label="TestoZa" class="ma-us">None needed; exam tools are built in.</td></tr>
<tr><th scope="row">Student accounts</th><td data-label="Self-hosted">One per student (username, name, email), plus enrolment.</td><td data-label="MoodleCloud">The same, and each counts toward the user limit.</td><td data-label="TestoZa" class="ma-us">None for live exams: a code and a roll number. Sign-in optional for practice tests.</td></tr>
<tr><th scope="row">Getting questions in</th><td data-label="Self-hosted">A form per question, or GIFT, Aiken and Moodle XML files. Word needs a plugin; no PDF.</td><td data-label="MoodleCloud">Forms and text formats, no plugins.</td><td data-label="TestoZa" class="ma-us">AI reads PDFs and photos of papers, diagrams included. Or type them.</td></tr>
<tr><th scope="row">AI question writing</th><td data-label="Self-hosted">Through plugins and a paid account with an AI provider.</td><td data-label="MoodleCloud">Not available (no plugins).</td><td data-label="TestoZa" class="ma-us">Built in, on the free plan.</td></tr>
<tr><th scope="row">Negative marking</th><td data-label="Self-hosted">A percentage per wrong option, from a fixed list; Deferred feedback mode for single-answer questions.</td><td data-label="MoodleCloud">The same.</td><td data-label="TestoZa" class="ma-us">Any value per question, such as +4 and −1.</td></tr>
<tr><th scope="row">Exam screen</th><td data-label="Self-hosted">Moodle’s quiz page, with a navigation panel and flags.</td><td data-label="MoodleCloud">The same.</td><td data-label="TestoZa" class="ma-us">NTA-style: question palette, mark for review, section tabs.</td></tr>
<tr><th scope="row">Lockdown</th><td data-label="Self-hosted">Safe Exam Browser on Windows, macOS and iOS.</td><td data-label="MoodleCloud">The same.</td><td data-label="TestoZa" class="ma-us">Full screen and tab-switch rules in any browser, Android included (paid plans).</td></tr>
<tr><th scope="row">Running a live exam</th><td data-label="Self-hosted">Open and close times, and overrides per user or group.</td><td data-label="MoodleCloud">The same.</td><td data-label="TestoZa" class="ma-us">An exam room: lobby, Start button, live list, extra time, projector view.</td></tr>
<tr><th scope="row">Results</th><td data-label="Self-hosted">Grades and responses to download, and a strong statistics report.</td><td data-label="MoodleCloud">The same.</td><td data-label="TestoZa" class="ma-us">Rank list, section averages, report cards, Excel, WhatsApp messages to parents.</td></tr>
<tr><th scope="row">Courses, assignments, forums</th><td data-label="Self-hosted">Yes.</td><td data-label="MoodleCloud">Yes.</td><td data-label="TestoZa" class="ma-us ma-no">No.</td></tr>
</tbody>
</table></div>
<p>The pattern is simple. The further your use is from “set a test and mark it”, the stronger Moodle’s case. The closer it is, the more of Moodle you’re maintaining without using.</p>
`),
                ],
            },
            {
                id: 'running-moodle',
                title: 'What running Moodle actually takes',
                tocLabel: 'Running Moodle',
                kicker: 'The hidden work',
                blocks: [
                    html(`
<p>Moodle is free to download. Running it isn’t free, and most of the cost is someone’s time. Moodle’s own installation guide says it is “intended for administrators experienced with installing web server applications”, and for Moodle 5.2, the current version, the list looks like this:</p>
<ol class="ma-list ma-list--num">
<li><strong>A web server</strong> such as Apache or Nginx, serving Moodle’s <code>public</code> folder over HTTPS.</li>
<li><strong>PHP 8.3 or later</strong>, 64-bit, with the sodium extension and <code>max_input_vars</code> raised to at least 5,000.</li>
<li><strong>A database</strong>: PostgreSQL 16, MySQL 8.4 or MariaDB 10.11 or later.</li>
<li><strong>A data folder</strong> outside the web root, with the right permissions.</li>
<li><strong>A cron job every minute.</strong> Moodle’s documentation is blunt about it: “Your site will not work properly without it.”</li>
<li><strong>Outgoing email</strong>, so password resets and notifications arrive.</li>
<li><strong>Backups</strong>, and a restore you have actually tested.</li>
</ol>
<p>Then it has to be kept up. Moodle ships two major versions a year. Each gets bug fixes for about 12 months and security fixes for about 18; a long-term support version, roughly one every two years, gets security fixes for three. Every upgrade means checking that each plugin you depend on supports the new version, and plugins written by volunteers don’t always keep pace.</p>
`),
                    { type: 'widget', widget: 'moodle-support', fallbackHtml: SUPPORT_FALLBACK },
                    html(`
<p>A site still on Moodle 5.0 stops getting security fixes on 5 October 2026. Security fixes for 5.1 end on 19 April 2027, and 4.5, the current long-term version, is covered until 4 October 2027. None of this is unusual for serious software. It’s simply work that someone in your institute has to own, every year, on top of teaching.</p>
<h3>MoodleCloud: Moodle without the server</h3>
<p>MoodleCloud is Moodle HQ’s own hosting. It takes the server, upgrades and backups away, and it’s priced by the number of users. Yearly prices in rupees, as listed on 2 October 2026:</p>
<div class="ma-table-wrap"><table class="ma-table ma-table--price">
<thead><tr><th scope="col">Plan</th><th scope="col">Users</th><th scope="col">Storage</th><th scope="col">Per year</th></tr></thead>
<tbody>
${PRICE_ROWS}
</tbody>
</table></div>
<p>The trade-offs are worth knowing before you sign up. MoodleCloud’s standard plans don’t allow plugins or integrations, so anything that needs one (Word import, AI question generation, most exam add-ons) is off the table. Every student and teacher counts toward the user limit, so an institute with 300 students needs the Medium plan. There’s a 28-day free trial with no card.</p>
<p>If the hours spent on self-hosting are what’s hurting, MoodleCloud or a Moodle Partner is the fix that keeps your courses intact. If tests are most of what you use Moodle for, read on.</p>
`),
                ],
            },
            {
                id: 'exam-day',
                title: 'Exam day without student accounts',
                tocLabel: 'Exam day',
                kicker: 'Joining and monitoring',
                blocks: [
                    html(`
<p>In Moodle, everyone who takes a quiz needs an account. Guests “cannot participate in any activities; they can only view content”. So a test means a username for every student, an email address (a required field in Moodle’s bulk upload), enrolment in the course and, on the day, the students who forgot their password. Self-enrolment with a key helps, but each student still has to register first.</p>
<p>TestoZa has two ways in, and neither needs you to create accounts:</p>
<ul class="ma-list">
<li><strong>A test link.</strong> Share it on WhatsApp or in the class group. You decide whether students sign in before they start; for a quick class test they don’t have to.</li>
<li><strong>A live exam with a join code.</strong> Give a paper to a batch as a sitting with its own six-digit code and time window. Candidates open testoza.com/join (or scan the QR code), type the code and check in with their name, their roll number, or their roll number and a four-digit PIN from a printed slip. They wait in a lobby until you start. No account, no password, no email.</li>
</ul>
<p>The batch list is the nearest thing to Moodle’s user upload, and it’s lighter: paste roll numbers and names straight from Excel or WhatsApp, with a parent’s phone number if you want one, or upload the sheet. Here is the teacher’s side of a live exam. <strong>You’re the teacher:</strong> wait for the batch to join, start the exam, give someone more time, then end it.</p>
`),
                    { type: 'widget', widget: 'moodle-exam-room', fallbackHtml: EXAM_ROOM_FALLBACK },
                    html(`
<h3>When something goes wrong in the middle of an exam</h3>
<ul class="ma-checks">
<li><strong>A phone dies.</strong> The candidate joins again on any device with the same details and carries on; answers reach the server every 20 seconds. The room shows “Changed device” next to their name.</li>
<li><strong>The connection drops.</strong> The phone keeps the answers, and the room shows “No signal” and for how long, so the invigilator knows whom to check on.</li>
<li><strong>Someone arrives late.</strong> New candidates can join until the start plus the late-entry minutes you allow. Each candidate’s clock runs from their own start, and never past the closing time.</li>
<li><strong>Someone needs more time.</strong> Give one candidate 5 or 10 more minutes, or everyone still writing 5 to 30. Their phone says so.</li>
<li><strong>Time runs out.</strong> Papers submit themselves, so a candidate who walked away still gets marked. When you end the exam early, everyone still writing has their last saved answers submitted for them.</li>
<li><strong>Someone was absent.</strong> One tap sets up a re-test sitting for the absentees with the same paper.</li>
</ul>
<p>The same room has a projector view: the code big enough to read from the back of a hall, a QR code, names appearing as candidates join, and the countdown. Nothing on it is private, so it’s safe to put on the wall.</p>
`),
                ],
            },
            {
                id: 'questions',
                title: 'Getting your questions in: forms and formats, or a photo',
                tocLabel: 'Questions',
                kicker: 'Question bank',
                blocks: [
                    html(`
<p>Moodle’s question bank is one of its best parts: categories, versions, random questions drawn from a pool, the same question reused across quizzes. Filling it is the slow part. Each question is a form: the text, the options, a grade for every option, feedback. For bulk entry Moodle imports text formats such as GIFT, Aiken and Moodle XML. Word import is a separate plugin, and there’s no PDF import at all. In GIFT, a question marked +4/−1 looks like this:</p>
<figure class="ma-code"><figcaption>GIFT</figcaption><pre><code><span class="g-name">::Q14 Refraction::</span>A ray of light passes from air into glass.
Which of these stays the same? <span class="g-brace">{</span>
  <span class="g-right">=Frequency</span>
  <span class="g-wrong">~%-25%</span>Speed
  <span class="g-wrong">~%-25%</span>Wavelength
  <span class="g-wrong">~%-25%</span>Direction of travel
<span class="g-brace">}</span></code></pre></figure>
<p>That works, and teachers who learn the syntax get quick at it. But most question papers in Indian institutes live as PDFs, scanned pages, photos of a printed booklet or Word files full of equations, and turning those into GIFT is typing.</p>
<p>TestoZa starts from the file you already have. Upload PDFs or photos to the <a href="/generate-with-ai">AI test generator</a> (save Word and PowerPoint files as PDF first) and choose how to use them:</p>
<div class="ma-cards">
<article class="ma-card" data-icon="doc" data-tone="blue"><h3>Extract</h3>
<p>Keeps a paper exactly as printed: wording, options, numbers and diagrams, cropped from the page. Upload the answer key as a separate file and the answers are matched. A question the key doesn’t cover is flagged, not guessed.</p></article>
<article class="ma-card" data-icon="sparkles" data-tone="purple"><h3>Generate</h3>
<p>Writes new questions from a chapter or your notes, at Easy, Moderate or Tough, in English, Hindi or both, following instructions such as “four options, include two assertion–reason questions”.</p></article>
<article class="ma-card" data-icon="pencil" data-tone="orange"><h3>Build by hand</h3>
<p>A question card with <strong>Fill from photo</strong> for one printed or handwritten question, and the Sy Pad keyboard for fractions, powers and chemical formulas, with no LaTeX to learn.</p></article>
</div>
<p>Questions appear as they’re read, then open in a review screen that flags anything still missing an answer. Read every question once before the test goes live: AI reads well, not perfectly, and a dropped “not” changes the answer. Our <a href="/ai-test-generator">AI test generator guide</a> goes into the details.</p>
<h3>Moodle’s AI, for comparison</h3>
<p>Moodle has had an AI subsystem since version 4.5. It connects to providers such as OpenAI, Azure AI, DeepSeek or a local Ollama server, and from 5.2 Gemini and Amazon Bedrock, and it offers text and image generation in the editor and summaries of course content. Writing quiz questions isn’t one of its built-in actions; that comes from plugins in the Moodle directory, and every provider needs its own account and paid API key that your administrator sets up. On MoodleCloud, where plugins aren’t allowed, that route is closed.</p>
`),
                ],
            },
            {
                id: 'marking',
                title: 'Negative marking the way Indian exams do it',
                tocLabel: 'Marking',
                kicker: 'Marks',
                blocks: [
                    html(`
<p>Almost every Indian entrance and recruitment exam uses negative marking: +4/−1 for NEET and JEE Main, +5/−1 for CUET-UG, +2/−0.5 for SSC CGL, a quarter of the mark for IBPS bank exams and a third for UPSC prelims. Moodle can do it, with care:</p>
<ul class="ma-list">
<li><strong>A percentage per wrong option.</strong> Each option’s grade is a percentage of the question’s mark, picked from a fixed list: 100%, 90%, 83.33333%, 80%, 75% and so on down to 5%, and their negatives. −1 on a 4-mark question is −25%.</li>
<li><strong>Single-answer questions need Deferred feedback.</strong> A negative grade on a single-answer question only counts when the quiz uses the Deferred feedback behaviour, Moodle’s “traditional exam” mode.</li>
<li><strong>Multiple-answer questions stop at zero.</strong> If a student’s choices add up to less than zero, the question scores zero, so the wrong options can’t cost marks overall.</li>
</ul>
<p>In TestoZa, marks are two numbers on every question card, Marks and Wrong, and each new question copies the one before it, so a 180-question paper is set once. Any value works. A multiple-correct question earns part of its marks when only some of the right options are chosen, and the negative mark if any chosen option is wrong. A numerical answer can be a range, such as 9.7 to 9.9. Scores are worked out on the server, not in the student’s browser.</p>
<p>Try your exam’s scheme. The converter shows the setting Moodle would need, and whether its list allows it:</p>
`),
                    { type: 'widget', widget: 'moodle-marking', fallbackHtml: MARKING_FALLBACK },
                ],
            },
            {
                id: 'phones',
                title: 'Phones, lockdown and patchy internet',
                tocLabel: 'Phones',
                kicker: 'Where students are',
                blocks: [
                    html(`
<p>In India, the device in a student’s hand is almost always an Android phone: 93.9% of mobile web traffic in September 2026, by Statcounter’s count. For exams, that matters more than anything else on this page.</p>
<p>Moodle’s main answer to cheating in quizzes is Safe Exam Browser, a separate app that locks the device while the quiz is open. It’s good, and it runs on Windows, macOS and iOS. There’s no Android version. On the phone most Indian students own, a Moodle quiz runs in an ordinary browser or the Moodle app, with the quiz password and network restrictions as the main guards. The Moodle app can also let students take a quiz offline, but only one with no time limit.</p>
<p>TestoZa’s exam rules run inside the browser, on any device, with nothing to install:</p>
<ul class="ma-checks">
<li><strong>Full screen to start.</strong> Leaving it counts as a warning.</li>
<li><strong>Tab and app switches are counted.</strong> After the number of warnings you choose, the paper submits itself, or you can simply see the count.</li>
<li><strong>Copy, paste and right-click are off,</strong> and the back button is blocked.</li>
<li><strong>Answers stay on the phone</strong> as candidates work and sync when the signal allows, so a weak connection doesn’t cost the test.</li>
<li><strong>The exam screen fits a phone.</strong> On small screens the question palette opens from a round button, so the question gets the whole screen.</li>
</ul>
<p class="ma-note"><strong>Be realistic about any browser.</strong> These rules make cheating harder and make it show up in the room’s warnings. They don’t make it impossible, and no phone-based exam can. For exams that decide admissions or jobs, use a supervised hall or computer lab, with the rules switched on.</p>
`),
                ],
            },
            {
                id: 'results',
                title: 'Results: what Moodle reports, and what an exam tool adds',
                tocLabel: 'Results',
                kicker: 'After the exam',
                blocks: [
                    html(`
<p>Credit where it’s due: Moodle’s quiz reports are thorough. Grades and responses download as spreadsheets, and the statistics report gives each question a facility index (how many got it right) and a discrimination index (whether stronger students did better on it than weaker ones). If your exam cell relies on that report, you’ll miss it less than you might think: TestoZa’s analysis page also gives every question its accuracy, how the batch split across the options, the average time spent and a discrimination index.</p>
<p>What changes is everything around the numbers, which in most institutes is where the evening goes:</p>
<ul class="ma-list">
<li><strong>The rank list, straight away.</strong> Marks appear as each paper arrives, and the rank list is ready when the last one does. Copy it, send it to the class group on WhatsApp or download it as Excel.</li>
<li><strong>Sections and topics.</strong> The class average for each section, and for each candidate the topics they’re strong in and the ones to practise.</li>
<li><strong>Report cards.</strong> One A4 page per candidate, ready to print or save as a PDF.</li>
<li><strong>Messages to parents.</strong> A WhatsApp message with the candidate’s marks and rank, filled in and ready, one tap per parent, and a different one for absentees. Nothing is sent without you.</li>
<li><strong>Results when you say so.</strong> Release them when the exam ends, as each candidate submits, or by hand. Candidates in a live exam never receive the answer key.</li>
<li><strong>Something for the student.</strong> Their score, rank, right, wrong and skipped questions, and how they did against the class average and the top score.</li>
</ul>
<p>Students who take tests through a link while signed in also get the time they spent on every question and an AI tutor on the results page that can explain what they got wrong.</p>
`),
                ],
            },
            {
                id: 'switching',
                title: 'Switching from Moodle, or running both',
                tocLabel: 'Switching',
                kicker: 'Step by step',
                blocks: [
                    html(`
<p>You don’t have to move everything at once, and you don’t have to switch at all to try it. A sensible order:</p>
<ol class="ma-steps">
<li><strong>Keep your records.</strong> Download the quiz grades and responses you need to keep (Moodle exports them as spreadsheets), and take a full backup of each course before you change anything.</li>
<li><strong>Bring over the questions you’ll reuse.</strong> TestoZa can’t read GIFT or Moodle XML files. If your questions started life as Word files or PDFs, upload those to Extract. If they only exist in Moodle, set the quiz to show every question on one page, open its preview, save it as a PDF and extract from that, with a review page showing the right answers as the key.</li>
<li><strong>Make your batches.</strong> Paste roll numbers and names from the sheet you already keep.</li>
<li><strong>Run one real test side by side.</strong> The same paper, one batch on TestoZa, and compare the effort and the results with your usual Moodle quiz.</li>
<li><strong>Decide what stays.</strong> If courses stay in Moodle, add the TestoZa test link, or testoza.com/join, to the course page as a URL resource, so students find it where they always look.</li>
</ol>
<p>One honest limit for anyone running both: TestoZa has no LTI connection, so marks don’t flow into Moodle’s gradebook by themselves. Download the results as Excel and bring them in with Moodle’s grade import if the gradebook needs them.</p>
`),
                ],
            },
            {
                id: 'other-alternatives',
                title: 'Other Moodle alternatives, and who they suit',
                tocLabel: 'Other options',
                kicker: 'The wider field',
                blocks: [
                    html(`
<p>TestoZa isn’t the only answer, and for some readers it’s the wrong one. Here’s the honest map:</p>
<div class="ma-table-wrap"><table class="ma-table ma-table--alts">
<thead><tr><th scope="col">If you need</th><th scope="col">Look at</th><th scope="col">Keep in mind</th></tr></thead>
<tbody>
<tr><th scope="row">Another full LMS, open source</th><td data-label="Look at">Canvas LMS, Open edX, Chamilo, ILIAS</td><td data-label="Keep in mind">You trade one server for another, and moving courses between LMSs is real work.</td></tr>
<tr><th scope="row">A free classroom for a school on Google</th><td data-label="Look at">Google Classroom with Google Forms quizzes</td><td data-label="Keep in mind">Free with Google Workspace for Education. Forms has no built-in exam timer or negative marking.</td></tr>
<tr><th scope="row">Training for employees</th><td data-label="Look at">Hosted business LMSs such as TalentLMS or Docebo</td><td data-label="Keep in mind">Usually priced by the number of users; built around courses, compliance and certificates.</td></tr>
<tr><th scope="row">Selling courses</th><td data-label="Look at">Course platforms built for payments and marketing</td><td data-label="Keep in mind">Tests are a side feature.</td></tr>
<tr><th scope="row">Tests and exams, without an LMS</th><td data-label="Look at">Exam platforms such as TestoZa, ClassMarker and Testmoz</td><td data-label="Keep in mind">No courses or forums. Compare the marking, the exam screen and how candidates get in.</td></tr>
</tbody>
</table></div>
<p>If one of those is already on your list, we’ve compared TestoZa directly with <a href="/compare/google-forms-alternative">Google Forms</a>, <a href="/compare/classmarker-alternative">ClassMarker</a> and <a href="/compare/testmoz-alternative">Testmoz</a>.</p>
`),
                ],
            },
            {
                id: 'limits',
                title: 'Where Moodle is the better tool',
                tocLabel: 'Honest limits',
                kicker: 'Worth knowing',
                blocks: [
                    html(`
<ul class="ma-limits">
<li><strong>Courses, lessons, SCORM and forums.</strong> TestoZa has none of them. If you teach inside Moodle, stay there.</li>
<li><strong>Essays and file uploads.</strong> TestoZa marks objective questions: single correct, multiple correct, numerical answers and passage-based sets. No essays, short written answers, file submissions or drag-and-drop.</li>
<li><strong>A term gradebook.</strong> Moodle adds up assignments, quizzes and more across a term. TestoZa reports each test, and combining tests is a spreadsheet job.</li>
<li><strong>Integrations.</strong> No LTI, no single sign-on with your Moodle, no plugins. That’s why there’s nothing to maintain, and also why it won’t connect to everything.</li>
<li><strong>Your own server.</strong> Moodle can run inside your campus network, with the data on your own disks. TestoZa is a hosted service; if policy requires self-hosting, it’s not an option.</li>
<li><strong>Exporting questions.</strong> Questions can’t be exported to GIFT or Moodle XML. Results download as Excel.</li>
<li><strong>Locked-down lab machines.</strong> On Windows and Mac computers in a lab, Safe Exam Browser locks the machine more thoroughly than any rule inside a browser can.</li>
<li><strong>Some controls are paid.</strong> Exam-security rules, scheduling, institute branding and Excel export come with the weekly, monthly or yearly plans on the <a href="/pricing">pricing page</a>. Building tests, AI import (with hourly limits), taking tests and live exams are free.</li>
</ul>
<p>If two or three of these are deal-breakers, keep Moodle and fix the hosting. If none of them are, you’re maintaining an LMS to run a quiz.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'What is the best Moodle alternative?',
                a: 'It depends on what you use Moodle for. If you need a full LMS with courses, assignments and forums, look at Canvas LMS, Open edX or Chamilo, or keep Moodle on managed hosting such as MoodleCloud. If you mainly use Moodle for quizzes and exams, an exam platform such as TestoZa is simpler: no server, no plugins, no student accounts, AI that turns question papers into tests, and negative marking set per question.',
            },
            {
                q: 'Is there a free alternative to Moodle?',
                a: 'Moodle itself is free software; the cost is hosting and administration. Canvas LMS, Open edX and Chamilo are also open source and free to self-host. Google Classroom is free with Google Workspace for Education. For tests and exams, TestoZa is free to build tests, generate questions with AI and run live exams; paid plans add exam-security rules, scheduling, branding and Excel export.',
            },
            {
                q: 'Is MoodleCloud free?',
                a: 'No. MoodleCloud offers a 28-day free trial, then yearly plans priced by users. On 2 October 2026 they ranged from ₹15,340 a year for 50 users (Starter) to ₹2,00,070 for 750 users (Standard). Plugins and integrations cannot be installed on these plans.',
            },
            {
                q: 'Can students take an online test without creating an account?',
                a: 'Not in Moodle: guests can only view content, so every quiz taker needs an account and enrolment. In TestoZa, yes. Candidates open testoza.com/join, type the six-digit code and check in with their name, roll number, or roll number and PIN. For practice tests shared as a link, the teacher decides whether sign-in is required.',
            },
            {
                q: 'How do candidates join a live exam on TestoZa?',
                a: 'The teacher gives a paper to a batch as a live exam and gets a six-digit code, a QR code and a projector view. Candidates go to testoza.com/join, enter the code, check in, and wait in a lobby until the exam starts. If a phone dies, they join again on another device with the same details and continue; answers are saved to the server every 20 seconds.',
            },
            {
                q: 'Does Moodle support negative marking?',
                a: 'Yes, with conditions. Each wrong option gets a negative percentage of the question’s mark, chosen from a fixed list (for example −25% for +4/−1). For single-answer questions the negative grade only applies with the Deferred feedback behaviour, and multiple-answer questions never score below zero. In TestoZa, Marks and Wrong are two numbers on each question.',
            },
            {
                q: 'Can I import my Moodle question bank into TestoZa?',
                a: 'Not directly: TestoZa does not read GIFT or Moodle XML files. Upload the original Word files (saved as PDF) or PDFs to the AI test generator’s Extract mode, or print the Moodle quiz preview to PDF and extract from that, with the answer key as a separate file. Check each question once before it goes live.',
            },
            {
                q: 'Can I use TestoZa and Moodle together?',
                a: 'Yes. Many institutes keep lessons and assignments in Moodle and run tests in TestoZa, linking to the test or to testoza.com/join from the Moodle course page as a URL resource. There is no LTI connection, so to put marks in Moodle’s gradebook, download the results as Excel and use Moodle’s grade import.',
            },
            {
                q: 'Does Safe Exam Browser work on Android phones?',
                a: 'No. Safe Exam Browser runs on Windows, macOS and iOS and has to be installed on each device. Android had 93.9% of India’s mobile web traffic in September 2026 (Statcounter), so most students’ phones can’t use it. TestoZa’s full-screen and tab-switch rules work in any browser, including on Android, though no browser rule can make cheating impossible.',
            },
            {
                q: 'Which Moodle versions are supported right now?',
                a: 'As of 2 October 2026, Moodle 5.2 (released 20 April 2026) is the current release. Moodle 5.0 loses security support on 5 October 2026, 5.1 on 19 April 2027, and 4.5, the current long-term support release, on 4 October 2027. Moodle 5.3, the next long-term release, is scheduled for 5 October 2026.',
            },
            {
                q: 'Is TestoZa an LMS?',
                a: 'No. TestoZa is for tests and exams: building papers (by hand or with AI), running them on an exam-style screen, live exams with join codes, marking, rank lists, report cards and analysis. It has no courses, lessons, forums, assignments or term gradebook.',
            },
            {
                q: 'Can I make Hindi or bilingual tests?',
                a: 'Yes. TestoZa’s AI can keep your material’s language or write questions in English, Hindi or both, and in the test builder Hindi can be typed with English letters. Moodle supports Hindi through its language packs, but questions still have to be entered or imported by hand.',
            },
        ],

        closingTitle: 'Try it on your next test',
        closing: [
            html(`
<p>Start with whatever you have this week:</p>
<div class="ma-paths">
<a class="ma-path" href="/generate-with-ai" data-icon="doc"><span class="ma-path-who">Have the paper as a PDF?</span><span class="ma-path-what">Turn it into a test with AI</span></a>
<a class="ma-path" href="/user-guide/live-exam-sessions" data-icon="key"><span class="ma-path-who">Running an exam for a batch?</span><span class="ma-path-what">See how join codes and the exam room work</span></a>
<a class="ma-path" href="/create-test" data-icon="layers"><span class="ma-path-who">Moving one Moodle quiz?</span><span class="ma-path-what">Build it with +4/−1 marking and sections</span></a>
</div>
<p>Related reading: <a href="/cbt-exam-software">CBT exam software</a>, <a href="/ai-test-generator">the AI test generator</a>, <a href="/best-online-test-platform">how to choose an online test platform</a>, <a href="/online-test-for-coaching">TestoZa for coaching institutes</a> and <a href="/pricing">pricing</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Moodle',
                links: [
                    { label: 'Moodle statistics', href: 'https://stats.moodle.org/' },
                    { label: 'Releases and support dates', href: 'https://moodledev.io/general/releases' },
                    { label: 'Moodle 5.2 requirements', href: 'https://moodledev.io/general/releases/5.2' },
                    { label: 'Installation quick guide', href: 'https://docs.moodle.org/502/en/Installation_quick_guide' },
                    { label: 'Cron', href: 'https://docs.moodle.org/502/en/Cron' },
                    { label: 'Guest access', href: 'https://docs.moodle.org/502/en/Guest_access' },
                    { label: 'Upload users', href: 'https://docs.moodle.org/502/en/Upload_users' },
                    { label: 'Import questions', href: 'https://docs.moodle.org/502/en/Import_questions' },
                    { label: 'GIFT format', href: 'https://docs.moodle.org/502/en/GIFT_format' },
                    { label: 'Multiple choice question type', href: 'https://docs.moodle.org/502/en/Multiple_Choice_question_type' },
                    { label: 'Allowed answer grades (question/engine/bank.php)', href: 'https://github.com/moodle/moodle/blob/main/public/question/engine/bank.php' },
                    { label: 'Quiz settings', href: 'https://docs.moodle.org/502/en/Quiz_settings' },
                    { label: 'AI placements', href: 'https://docs.moodle.org/502/en/AI_placements' },
                    { label: 'AI providers', href: 'https://docs.moodle.org/502/en/AI_providers' },
                    { label: 'Safe Exam Browser', href: 'https://docs.moodle.org/502/en/Safe_Exam_Browser' },
                    { label: 'Moodle app offline features', href: 'https://docs.moodle.org/502/en/Moodle_app_offline_features' },
                ],
            },
            {
                label: 'MoodleCloud',
                links: [{ label: 'Standard plans and prices', href: 'https://www.moodlecloud.com/standard-plans/' }],
            },
            {
                label: 'Phones in India',
                links: [{ label: 'Statcounter, mobile operating systems in India', href: 'https://gs.statcounter.com/os-market-share/mobile/india' }],
            },
            {
                label: 'Other platforms',
                links: [
                    { label: 'Canvas LMS (open source)', href: 'https://github.com/instructure/canvas-lms' },
                    { label: 'Open edX', href: 'https://openedx.org/' },
                    { label: 'Chamilo', href: 'https://chamilo.org/' },
                    { label: 'Google Workspace for Education editions', href: 'https://edu.google.com/workspace-for-education/editions/compare-editions/' },
                ],
            },
        ],
    },
};
