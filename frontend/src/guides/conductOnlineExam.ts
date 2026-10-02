/**
 * testoza.com/how-to-conduct-online-exam — the whole process of running an online
 * exam, as an exam controller would: plan it, prepare the paper, choose how
 * candidates get in, set exam rules, rehearse, run the day, publish results. Written
 * for school teachers, coaching institutes, college exam cells and recruiters, with
 * TestoZa as the worked example.
 *
 * Outside facts (sources in `sources`, checked 2 October 2026):
 *   - Published patterns: NEET-UG 180 questions in 180 min (+4/−1); JEE Main paper 1
 *     75 questions in 3 h (+4/−1); CUET-UG 50 compulsory questions per subject in
 *     60 min (+5/−1); SSC CGL Tier 1 100 questions in 60 min (+2/−0.5).
 *   - Google Forms quizzes: no built-in timer or negative marking (add-ons only);
 *     locked mode works only on managed Chromebooks (Google's announcement).
 *   - Statcounter, India, September 2026: Android 93.89 % of mobile web traffic.
 *
 * TestoZa claims checked against the code on 2 October 2026:
 *   - Two ways to run an exam: a private exam link (ConductExamDialog, lib/conductExam.ts:
 *     unlisted /test/<slug>, optional start form and schedule) and a sitting with a
 *     join code (Exams → New exam: components/exams/NewExamSheet.tsx).
 *   - New exam: paper; Now/Later; More options: batch, late entry 0/5/10/15/30/60,
 *     start On time / I tap Start, check-in Name only / Roll number / Roll number +
 *     PIN, walk-ins, results When the exam ends / Right after each candidate submits /
 *     When I release them, name. Closing time = start + duration + late entry + 10 min.
 *     The lobby opens 30 min before the start.
 *   - Join (pages/join/JoinPage.tsx, backend join.py, services/exam_sessions.py): code at
 *     testoza.com/join or QR; PINs are 4 digits, shown once, printed as slips; deadline
 *     per candidate = earlier of own start + duration + extra and closing + extra;
 *     server clock; heartbeat every 20 s saves the draft; rejoin on another device
 *     pauses the old one and flags "Changed device"; papers reaching the server up to
 *     15 min late are accepted and flagged (SUBMIT_GRACE).
 *   - Exam room (pages/exams/ExamSessionPage.tsx, MonitorPanel, ResultsPanel,
 *     ExamPresentPage, RetestSheet, ReportCardsPage): Start, More time +5/10/15/30 for
 *     everyone writing, per candidate +5/+10, submit now, remove, new PIN; candidate's
 *     phone shows "Your teacher gave you N more minutes."; End exam submits last saved
 *     answers; projector view; rank list copy / WhatsApp / Excel; report cards; parent
 *     WhatsApp (wa.me, nothing automatic); re-test for absentees; answer key never sent
 *     to sitting candidates.
 *   - Exam rules (components/TestSettingsPanel.tsx, pages/TestPage.tsx): Force Full
 *     Screen, Tab/App Switch Detection, warn only or 2–5 warnings then submit, Disable
 *     Copy/Paste, Disable Right Click, Block Back Button, Disable Exit Button, shuffle
 *     question order. Violations reach the room with the heartbeat. Rules are part of
 *     the paid plans (settings save is premium-gated).
 *   - NOT in the product: webcam or screen proctoring, essays or subjective marking,
 *     LTI. Don't claim them.
 */
import { CONDUCT_META } from './meta';
import { CHECKLIST, EXAM, EXAM_PATTERNS, perQuestion, spacedCode } from './conductData';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const PLANNER_FALLBACK = `
<p>A planner that turns four answers into a setup. What’s at stake: practice, a class or weekly test, a full mock or term exam, or a selection exam for admission or a job. Where candidates sit: one room, several rooms or labs, or at home. Their devices: mostly phones, computers or a mix. How many candidates. For a class test in one room on phones, it suggests a join code with roll numbers, starting when you tap Start, five minutes of late entry, app-switch detection with warnings only, and results when the exam ends. For a selection exam it adds four-digit PINs, full screen, submitting after three warnings, holding results until you release them, and a supervised hall instead of home.</p>`;

const NEW_EXAM_FALLBACK = `
<p>A working copy of TestoZa’s “New exam” sheet. Pick the question paper (“${EXAM.paper}”, ${EXAM.questions} questions, ${EXAM.minutes} minutes) and when it starts, now or at a date and time; the sheet shows the time after which nobody can write. Under “More options” are the batch (${EXAM.batch}, ${EXAM.roster} candidates with PINs), late entry (none to 60 minutes), the start (on time, or when you tap Start), how candidates check in (name only, roll number, or roll number and PIN), whether candidates not on the list may join, when candidates see results (when the exam ends, right after each submits, or when you release them) and a name. “Create exam and get the code” ends on a six-digit code such as ${spacedCode()}, a QR code, buttons to copy the invitation, send it on WhatsApp or show the code on a projector, and a link to the exam room.</p>`;

const RULES_FALLBACK = `
<p>TestoZa’s exam rules beside a candidate’s phone. The rules are Force Full Screen (exiting counts as a violation), Tab/App Switch Detection, the violation action (warn only, or a number of warnings and then the paper submits itself), and switches to disable copy and paste, disable right-click and block the back button. On the phone, switching to another app while detection is on shows “Warning 1/3: Tab Switching / Navigation is not allowed!”; leaving full screen shows “Full Screen Required” with a log of exits; copying shows “Copy/Paste is disabled for this test.” The fourth violation with a limit of three shows “Maximum Violations Reached” and submits the paper. Each warning also appears next to the candidate’s name in the teacher’s exam room.</p>`;

const EXAM_DAY_FALLBACK = `
<p>A replica of both sides of a live exam: the teacher’s exam room and one candidate’s phone. “${EXAM.sitting}” for batch ${EXAM.batch}: ${EXAM.questions} questions in ${EXAM.minutes} minutes, +${EXAM.right} for a right answer and −${EXAM.wrong} for a wrong one, joined with the code ${spacedCode()} at testoza.com/join with roll number and PIN. The teacher watches the lobby fill, taps “Start exam now” and follows a live list: who is writing, minutes left, questions answered, who has submitted, and flags for no signal, a changed device and warnings. One candidate loses signal and rejoins on another phone; another switches apps twice. The teacher can give everyone 5 to 30 more minutes or one candidate 5 or 10, submit one candidate’s paper or remove them, and end the exam, which submits everyone’s last saved answers. The candidate’s phone shows the lobby, the exam screen with its countdown, “Your teacher gave you 5 more minutes.”, the submitted screen and, once released, the result: marks, rank, right, wrong and skipped, and the class average. The results tab has the rank list with Excel, WhatsApp and report-card buttons.</p>`;

const CHECKLIST_FALLBACK = CHECKLIST.map((g) => `<h3>${g.when}</h3><ul>${g.items.map((i) => `<li>${i}</li>`).join('')}</ul>`).join('\n');

const PATTERN_ROWS = EXAM_PATTERNS.map(
    (p) =>
        `<tr><th scope="row">${p.exam}</th><td data-label="Questions">${p.questions}</td><td data-label="Time">${p.minutes} min</td><td data-label="Per question">${perQuestion(p.minutes, p.questions)}</td><td data-label="Marking">${p.marking}</td></tr>`,
).join('\n');

export const CONDUCT_ONLINE_EXAM: Guide = {
    meta: CONDUCT_META,
    body: {
        intro: [
            html(`
<p>Writing the questions is the part teachers worry about, and it’s rarely the part that fails. Online exams go wrong in the gaps around the paper: thirty candidates who can’t remember a password, a phone that dies at minute twenty, the answer key forwarded to a WhatsApp group while half the batch is still writing, a timer that runs out early on one phone, and marks that take a week to reach parents.</p>
<p>None of that is solved by a better question. It’s solved by running the exam the way a good exam controller runs a hall: deciding the rules before the day, rehearsing, knowing what to do when something breaks, and having results ready when the last paper comes in.</p>
<p>This guide walks through that process in seven steps, for a ten-minute class quiz as much as a full mock or a recruitment test. It uses TestoZa as the worked example because every step can be shown working on this page: you can set up an exam, try the anti-cheating rules as a candidate, and run a live exam from both sides, the teacher’s room and a candidate’s phone. The steps apply whatever tool you use, and the section on Google Forms says plainly when a free form is enough.</p>
`),
        ],

        answer: 'To conduct an online exam: decide what is at stake and where candidates will sit; prepare the paper with its marking scheme and a realistic time limit; choose how candidates get in (a private link, or a join code with roll numbers and PINs); switch on exam rules such as full screen and app-switch detection; rehearse with a few phones two days before; on the day, open the lobby, start, watch for problems and give extra time where it’s due; then end the exam, check the questions most candidates got wrong and release results. In TestoZa this runs in a browser with nothing to install: candidates open testoza.com/join, type a six-digit code and check in with a roll number, answers are saved every 20 seconds so a dead phone loses nothing, and the rank list is ready when the exam ends. Building and running exams is free; exam-security rules come with paid plans from ₹49 a week. No browser rule makes a phone exam cheat-proof, so exams that decide admissions or jobs belong in a supervised room.',

        sections: [
            {
                id: 'plan',
                title: 'Step 1: Decide what kind of exam it is',
                tocLabel: 'Plan it',
                kicker: 'Plan',
                blocks: [
                    html(`
<p>Every later choice follows from two questions: what is at stake, and where will candidates sit? A weekly test that nobody’s future depends on can be loose: a link in the class group, results as soon as each candidate submits. A mock that goes home to parents needs more care, and an exam that decides an admission or a job needs the most. Get these two answers wrong and you either annoy honest candidates with rules they don’t need, or run a selection exam with the door open.</p>
<p>Before you touch any software, settle four things:</p>
<ul class="co-list">
<li><strong>Stakes.</strong> Practice, a class or weekly test, a full mock or term exam, or a selection exam. The higher the stakes, the more you need to know exactly who sat the paper and the less you can rely on a browser alone.</li>
<li><strong>Place.</strong> One room you can see, several rooms or labs with someone in each, or candidates at home. At home, you can make cheating harder and visible, but you can’t see the room.</li>
<li><strong>Devices.</strong> In India the answer is usually phones: Android had 93.9% of mobile web traffic in September 2026. Computers in a lab behave differently from phones, and a mix of both needs a rehearsal on each.</li>
<li><strong>Size.</strong> Thirty candidates in one room is a class; three hundred across five centres is an operation that needs one person per room and a list of who is absent before you start.</li>
</ul>
<p>Answer them below and the planner suggests a setup. It’s the same reasoning the rest of this guide explains step by step:</p>
`),
                    { type: 'widget', widget: 'conduct-planner', fallbackHtml: PLANNER_FALLBACK },
                ],
            },
            {
                id: 'paper',
                title: 'Step 2: Prepare the question paper',
                tocLabel: 'The paper',
                kicker: 'Paper',
                blocks: [
                    html(`
<p>An online exam is marked by a computer, so the paper has to be made of questions a computer can mark: single correct answer, multiple correct answers, a numerical answer, or a set of questions on one passage. Long written answers, essays and diagrams drawn by hand still need a person and paper. If your exam has both, run the objective part online and the written part on paper; nobody gains from typing essays on a phone.</p>
<h3>Get the questions in without retyping them</h3>
<p>Most papers in Indian schools and institutes already exist as a PDF, a scanned page or a photo of a printed booklet. Typing them into forms one by one is where an evening disappears. In TestoZa, the <a href="/generate-with-ai">AI test generator</a> reads PDFs and photos (PNG, JPG and WEBP) and either keeps a paper exactly as printed, diagrams included, or writes new questions from a chapter. Upload the answer key as a separate file and the answers are matched; anything it can’t match is flagged, not guessed. Then read every question once. AI reads well, not perfectly, and a dropped “not” changes the answer. Our <a href="/ai-test-generator">guide to the AI test generator</a> covers this in detail.</p>
<h3>Set the marking before the exam, not after</h3>
<p>Decide the marking scheme first and put it on every question: marks for a right answer and marks taken off for a wrong one. In TestoZa these are two numbers on each question card, Marks and Wrong, and each new question copies the one before it, so +${EXAM.right}/−${EXAM.wrong} is set once for the whole paper. A multiple-correct question can give part marks when only some right options are chosen, and a numerical answer can be a range, such as 9.7 to 9.9, so rounding doesn’t cost a candidate. Split long papers into sections (Physics, Chemistry, Biology, or Reasoning, Quantitative, English) so results can show where each candidate is weak.</p>
<h3>Give the right amount of time</h3>
<p>The commonest mistake in a first online exam is too little time: reading on a phone is slower than on paper. National exams are a useful guide:</p>
<div class="co-table-wrap"><table class="co-table co-table--patterns">
<thead><tr><th scope="col">Exam</th><th scope="col">Questions</th><th scope="col">Time</th><th scope="col">Per question</th><th scope="col">Marking</th></tr></thead>
<tbody>
${PATTERN_ROWS}
</tbody>
</table></div>
<p>For a class test, a minute per one-mark question plus five minutes is a reasonable start, and two to three minutes for each numerical problem. Then keep the paper short. A 20-question test that everyone finishes tells you more than a 50-question test that half the batch abandons.</p>
<p class="co-note"><strong>One more check.</strong> Ask a second teacher to answer the paper once, without the key, before it goes live. It catches wrong keys, two right options and questions that only make sense with a diagram that didn’t come through, which is cheaper than fixing marks for a whole batch afterwards.</p>
`),
                ],
            },
            {
                id: 'access',
                title: 'Step 3: Choose how candidates get in',
                tocLabel: 'Getting in',
                kicker: 'Access',
                blocks: [
                    html(`
<p>This is where most first exams lose their first ten minutes. If every candidate needs an account and a password, some of them won’t have one on the day. The fewer steps between “open the phone” and “question 1”, the calmer the start.</p>
<p>TestoZa has two ways in, and neither needs you to create student accounts:</p>
<div class="co-table-wrap"><table class="co-table co-table--ways">
<thead><tr><th scope="col"></th><th scope="col">A private exam link</th><th scope="col">A live exam with a join code</th></tr></thead>
<tbody>
<tr><th scope="row">How candidates get in</th><td data-label="Exam link">Open a link you share, for example in the class WhatsApp group</td><td data-label="Join code">Open testoza.com/join and type a six-digit code, or scan the QR code</td></tr>
<tr><th scope="row">Who they are</th><td data-label="Exam link">A start form asks for their name and roll number, or they sign in</td><td data-label="Join code">Name only, roll number, or roll number and a four-digit PIN</td></tr>
<tr><th scope="row">When it runs</th><td data-label="Exam link">Any time, or inside a start and end time you set</td><td data-label="Join code">A sitting: lobby, start time or your Start button, late entry, closing time</td></tr>
<tr><th scope="row">What you watch</th><td data-label="Exam link">Results as they come in</td><td data-label="Join code">An exam room: who is in the lobby, writing, submitted or in trouble</td></tr>
<tr><th scope="row">Best for</th><td data-label="Exam link">Practice tests and homework tests</td><td data-label="Join code">Class tests, mocks and selection exams at a fixed time</td></tr>
</tbody>
</table></div>
<p>For anything at a fixed time, use the join code. One paper can be given to many batches, each as its own sitting with its own code, times and rank list: Batch A on Monday, Batch B on Thursday.</p>
<h3>Pick the check-in that fits the stakes</h3>
<ul class="co-list">
<li><strong>Name only.</strong> Quickest. Fine for a class quiz where you can see the room.</li>
<li><strong>Roll number.</strong> For weekly tests. Candidates type their roll number and the name fills in from your batch list, so “Rahul”, “rahul k” and “Rahul Kumar” don’t become three people.</li>
<li><strong>Roll number and PIN.</strong> For mocks that go to parents and anything that decides a seat. Each candidate gets a four-digit PIN on a printed slip, so nobody can sit the exam for a friend by typing their roll number. PINs are shown once, when you make them, and printed three slips across an A4 page. A lost slip means a new PIN, not a lookup.</li>
</ul>
<p>A batch is just your list: paste roll numbers and names straight from Excel or WhatsApp, with a parent’s phone number if you want to message parents later. It also tells the exam room who hasn’t joined. Here is the sheet that creates a sitting. Try it: choose the paper, open <strong>More options</strong>, pick roll number and PIN, and create the exam.</p>
`),
                    { type: 'widget', widget: 'conduct-new-exam', fallbackHtml: NEW_EXAM_FALLBACK },
                    html(`
<p>Everything under More options has a safe default, so for a class quiz the whole setup is two taps: the paper and “Now”. The closing time is worked out for you, from the start, the paper’s length and the late-entry minutes, plus ten minutes to spare.</p>
`),
                ],
            },
            {
                id: 'rules',
                title: 'Step 4: Set rules that stop casual cheating',
                tocLabel: 'Exam rules',
                kicker: 'Fairness',
                blocks: [
                    html(`
<p>Be clear about what a browser can and can’t do. On a candidate’s own phone, no software can see a second phone under the desk or a friend in the room. What it can do is stop the easy ways (copying the question into another app, searching it, switching to a chat) and make the rest visible, so you know whose paper to look at. That is worth a lot: most cheating in online tests is casual, and casual cheating stops when it’s noticed.</p>
<p>TestoZa’s exam rules are switches on the paper:</p>
<ul class="co-checks">
<li><strong>Force full screen.</strong> The candidate has to enter full screen to start, and leaving it counts as a violation.</li>
<li><strong>Tab and app switch detection.</strong> Switching to another app or tab, or minimising the browser, counts as a violation.</li>
<li><strong>What happens after violations.</strong> Warn only, or allow two to five warnings and then submit the paper automatically.</li>
<li><strong>Copy, paste and right-click off,</strong> and the back button blocked, so a stray swipe doesn’t leave the exam.</li>
<li><strong>Shuffle the question order,</strong> so neighbours aren’t on the same question at the same time.</li>
</ul>
<p>Try them as a candidate. Turn rules on or off, then switch to WhatsApp, leave full screen or copy the question, and watch what the candidate sees and what reaches the teacher:</p>
`),
                    { type: 'widget', widget: 'conduct-rules', fallbackHtml: RULES_FALLBACK },
                    html(`
<h3>Rules that protect honest candidates too</h3>
<p>The single most effective rule isn’t about the phone at all: <strong>don’t show results or answers until the exam has ended for everyone.</strong> If the first candidate to finish can see the answers, so can the WhatsApp group of everyone still writing. In a TestoZa sitting, “When the exam ends” is the recommended setting for results, and candidates in a sitting never receive the answer key.</p>
<p>A few more habits matter more than any switch:</p>
<ul class="co-list">
<li><strong>Tell candidates the rules in advance.</strong> A warning that comes as a surprise feels unfair; a rule announced the day before is just a rule.</li>
<li><strong>Set the warning limit with phones in mind.</strong> A low-battery pop-up or an incoming call can count as leaving the exam. Two or three warnings before an automatic submit is fairer than one.</li>
<li><strong>Read the warnings, don’t just count them.</strong> One warning at minute 3 is a notification. Six warnings in the last ten minutes is a pattern.</li>
<li><strong>Rehearse the full-screen rule on iPhones.</strong> Browsers differ in what they let a web page do, and Safari on an iPhone is stricter about full screen than Chrome on Android. If any candidates use iPhones, try the rule on one in your dry run; if it doesn’t behave, switch full screen off and rely on app-switch detection.</li>
</ul>
<p class="co-note"><strong>Be realistic.</strong> Browser rules make cheating harder and make it show up in the exam room. They don’t make it impossible, and no phone-based exam can. For exams that decide admissions or jobs, use a supervised hall or computer lab, with the rules on as well.</p>
`),
                ],
            },
            {
                id: 'rehearse',
                title: 'Step 5: Rehearse two days before',
                tocLabel: 'Dry run',
                kicker: 'Rehearsal',
                blocks: [
                    html(`
<p>The dry run is the step people skip, and it’s the one that saves the day. Two days before is the right time: late enough that the paper is final, early enough to fix what you find. It takes twenty minutes.</p>
<ol class="co-steps">
<li><strong>Create a short sitting with the real paper</strong> and the real settings, and join it from three phones: yours, a colleague’s, and the oldest, slowest phone you can borrow, since some candidate will have one like it.</li>
<li><strong>Break things on purpose.</strong> On one phone, switch to WhatsApp and come back. Lock the screen for a minute. Turn off mobile data, answer two questions, turn it back on. Then join from another phone with the same roll number and PIN and check the answers are still there.</li>
<li><strong>Read the paper on the smallest screen.</strong> Diagrams, tables and long options should be readable without squinting. If one isn’t, fix it now.</li>
<li><strong>Submit and check the marks by hand</strong> for two papers, one with a few wrong answers. If the negative marking is set wrong, this is where you’ll see it.</li>
<li><strong>Look at the exam room</strong> while you do all this, so on the day you already know what “No signal”, “Changed device” and a warning look like.</li>
</ol>
<p>Then tell candidates what to expect. A short message the day before prevents most exam-morning panic:</p>
<figure class="co-msg" aria-label="Example message to candidates">
<figcaption>Message to the batch, the day before</figcaption>
<div class="co-bubble"><p><strong>${EXAM.sitting} · ${EXAM.paper}</strong><br>Tomorrow 10:00 am · ${EXAM.minutes} minutes · ${EXAM.questions} questions (+${EXAM.right}, −${EXAM.wrong})</p>
<p>Before 9:50 am:<br>1. Charge your phone. Any browser works, no app needed.<br>2. Open testoza.com/join and type the code from the board.<br>3. Check in with your roll number and the PIN on your slip.</p>
<p>Stay on the exam page. Switching apps or leaving full screen is recorded. If your phone dies, join again on any phone with the same roll number and PIN; your answers are saved.</p>
<span class="co-bubble-time">6:30 pm</span></div>
</figure>
`),
                ],
            },
            {
                id: 'exam-day',
                title: 'Step 6: Run the exam',
                tocLabel: 'Exam day',
                kicker: 'On the day',
                blocks: [
                    html(`
<p>On the day, your job changes from teacher to controller: get everyone in, start on time, deal with problems quickly and fairly, and make sure every paper is filed at the end. A good sequence:</p>
<ul class="co-list co-list--num">
<li><strong>Thirty minutes before.</strong> The lobby opens. Put the code on the board, or open the projector view: the code large enough to read from the back, a QR code and names appearing as candidates join.</li>
<li><strong>Ten minutes before.</strong> Compare the lobby with your list. The exam room shows who hasn’t joined, so you can chase absentees before the start, not after.</li>
<li><strong>The start.</strong> Either the exam starts on its own at the time you set, or candidates wait in the lobby until you tap Start. In one room, tapping Start yourself is calmer; across several rooms, a fixed time is fairer.</li>
<li><strong>During.</strong> Watch the live list rather than the candidates’ screens: who is writing, how many questions each has answered, who has submitted, and who needs a look.</li>
<li><strong>The end.</strong> Papers submit themselves when time runs out. When you end the exam yourself, everyone still writing has their last saved answers submitted for them.</li>
</ul>
<p>Here is a live exam from both sides. <strong>You’re the teacher:</strong> wait for the batch to join, start the exam, give extra time when someone needs it, then end it. The phone beside the room is one candidate, Aditi, and shows what each of your actions does on her screen.</p>
`),
                    { type: 'widget', widget: 'conduct-exam-day', fallbackHtml: EXAM_DAY_FALLBACK },
                    html(`
<h3>When something goes wrong mid-exam</h3>
<ul class="co-checks">
<li><strong>A phone dies.</strong> The candidate joins again on any device with the same details and carries on from their saved answers; answers reach the server every 20 seconds. The old phone stops working for that exam, and the room shows “Changed device” next to their name.</li>
<li><strong>The connection drops.</strong> Answers stay on the phone and sync when the signal is back. The room shows “No signal” and for how long, so the invigilator knows whom to check on. A paper that reaches the server late because of the network is still accepted for 15 minutes and marked as late.</li>
<li><strong>Someone arrives late.</strong> New candidates can join until the start plus the late-entry minutes you allowed. Each candidate’s clock runs from their own start, but never past the closing time.</li>
<li><strong>Someone loses time through no fault of their own.</strong> Give that candidate 5 or 10 more minutes, or everyone still writing 5 to 30. Their phone says so within 20 seconds, at its next sync.</li>
<li><strong>Phones disagree about the time.</strong> They often do, by minutes. Every countdown in a TestoZa sitting runs on the server’s clock, so everyone’s 30 minutes are the same 30 minutes.</li>
<li><strong>Someone shouldn’t be there.</strong> Remove them from the exam, and their phone stops.</li>
</ul>
<p>Write down what happened and when: who lost signal, who got extra time and why. If a parent asks a week later, the answer is on paper, not in someone’s memory.</p>
`),
                ],
            },
            {
                id: 'results',
                title: 'Step 7: Results, re-tests and records',
                tocLabel: 'Results',
                kicker: 'After the exam',
                blocks: [
                    html(`
<p>The exam isn’t over when the last paper arrives. It’s over when candidates, parents and your records have the right marks. Four things, in this order:</p>
<ol class="co-steps">
<li><strong>Check the questions before the marks.</strong> Look at the questions most candidates got wrong. When nearly the whole batch picks the same wrong option, the key is often wrong, not the batch. TestoZa’s analysis shows each question’s accuracy and how the batch split across the options, which makes a wrong key easy to spot. Fix it before anyone sees a mark.</li>
<li><strong>Release results.</strong> If you chose “When the exam ends”, candidates see theirs as soon as it closes; with “When I release them” they wait for you. Each candidate gets their marks, rank, right, wrong and skipped answers, section marks, and how they compare with the class average and the top score.</li>
<li><strong>Share them.</strong> The rank list is ready when the last paper is in: copy it, send it to the class group on WhatsApp or download it as Excel. Report cards print one A4 page per candidate, or save as PDF. For parents there’s a WhatsApp message with each candidate’s marks and rank, filled in and ready, one tap per parent, and a different one for absentees. Nothing is sent without you.</li>
<li><strong>Deal with absentees.</strong> One tap sets up a re-test sitting for the candidates who missed the exam, with the same paper and a new code.</li>
</ol>
<p>Then keep the records. Download the results as Excel and file them with the date, the paper and any notes from the day. If you run a term gradebook elsewhere, that file is what you import.</p>
`),
                ],
            },
            {
                id: 'checklist',
                title: 'The exam controller’s checklist',
                tocLabel: 'Checklist',
                kicker: 'Keep this',
                blocks: [
                    html(`
<p>The whole process on one list. Tick items as you go; your ticks stay in this browser, so you can come back to it on exam morning.</p>
`),
                    { type: 'widget', widget: 'conduct-checklist', fallbackHtml: CHECKLIST_FALLBACK },
                ],
            },
            {
                id: 'mistakes',
                title: 'Eight mistakes that ruin online exams',
                tocLabel: 'Mistakes',
                kicker: 'Avoid these',
                blocks: [
                    html(`
<ul class="co-limits">
<li><strong>Accounts on the day.</strong> Asking candidates to sign up or remember a password at 9:55 am. Use a code and a roll number instead.</li>
<li><strong>Answers visible to early finishers.</strong> Results or the key shown on submission while others are still writing. Release results when the exam ends.</li>
<li><strong>Too little time.</strong> Paper timings copied onto phones. Add time for reading on a small screen, or cut questions.</li>
<li><strong>A wrong key.</strong> Found by sixty angry candidates instead of one colleague. Have the paper answered once before it goes live, and check the hardest questions before releasing marks.</li>
<li><strong>One warning and out.</strong> An automatic submit on the first app switch punishes an incoming call. Allow two or three.</li>
<li><strong>No plan for a dead phone.</strong> If candidates don’t know they can rejoin on another device, they panic. Put it in the instructions.</li>
<li><strong>Skipping the dry run.</strong> The problems a twenty-minute rehearsal finds are exactly the ones that ruin the real exam.</li>
<li><strong>Calling a home exam proctored.</strong> If the result decides a seat or a job, supervise the room. Rules in a browser are for fairness in ordinary tests, not for selection.</li>
</ul>
`),
                ],
            },
            {
                id: 'google-forms',
                title: 'Can you conduct an online exam with Google Forms?',
                tocLabel: 'Google Forms',
                kicker: 'Other tools',
                blocks: [
                    html(`
<p>Yes, for some exams, and it’s free. Google Forms has a quiz mode with an answer key, points per question and automatic grading, and many teachers start there. It’s a good fit for a short practice quiz where timing and negative marking don’t matter.</p>
<p>It gets harder as the stakes rise:</p>
<ul class="co-list">
<li><strong>No timer.</strong> Forms has no built-in time limit; you need an add-on, or you have to trust candidates to stop.</li>
<li><strong>No negative marking.</strong> Points can’t be taken off for a wrong answer without an add-on, so +4/−1 papers don’t mark the way the real exam does.</li>
<li><strong>Locked mode needs Chromebooks.</strong> Forms’ locked mode, which stops candidates leaving the quiz, works only on school-managed Chromebooks. On phones, the usual exam device in India, there’s no lock.</li>
<li><strong>No exam room.</strong> Responses arrive in a sheet. There’s no lobby, no start button, no list of who is writing or offline, and no extra time for one candidate.</li>
<li><strong>Results are a spreadsheet.</strong> Ranks, section marks, report cards and messages to parents are yours to build.</li>
</ul>
<p>If those don’t matter for your exam, Forms is fine. If they do, that’s the gap an exam platform fills. We’ve compared the two in more detail in <a href="/compare/google-forms-alternative">TestoZa vs Google Forms</a>. If you’re weighing a full learning management system, our guide to <a href="/moodle-alternative">Moodle alternatives</a> covers when an LMS is the better choice.</p>
`),
                ],
            },
            {
                id: 'limits',
                title: 'What this setup won’t do',
                tocLabel: 'Honest limits',
                kicker: 'Worth knowing',
                blocks: [
                    html(`
<ul class="co-limits">
<li><strong>No camera proctoring.</strong> TestoZa doesn’t record the candidate’s camera, microphone or screen. If an exam needs that, it needs a supervised room or a dedicated remote-proctoring service.</li>
<li><strong>Objective questions only.</strong> Single correct, multiple correct, numerical answers and passage-based sets. No essays, short written answers, file uploads or drag-and-drop.</li>
<li><strong>Internet at the start.</strong> Candidates need a connection to join and to submit. In between, a weak or dropped signal doesn’t lose answers.</li>
<li><strong>A hosted service.</strong> There’s nothing to install, which also means nothing to run on your own server. If your policy requires self-hosting, it isn’t an option.</li>
<li><strong>Some controls are paid.</strong> The exam-security rules, a schedule on exam links, institute branding and Excel export come with the weekly, monthly or yearly plans on the <a href="/pricing">pricing page</a>. Building papers, AI import (with hourly limits), join codes, the exam room and results are free.</li>
</ul>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'How do I conduct an online exam for students?',
                a: 'Decide what is at stake and where students will sit, prepare the paper with its marking scheme and time limit, choose how they get in (a link or a join code with roll numbers), switch on exam rules such as full screen and app-switch detection, rehearse with a few phones, then run the exam: open the lobby, start, watch for problems, end it and release results. In TestoZa students join at testoza.com/join with a six-digit code, no account needed.',
            },
            {
                q: 'Can I conduct an online exam for free?',
                a: 'Yes. In TestoZa, building papers, making them from PDFs or photos with AI (with hourly limits), running live exams with join codes, the exam room and results are free. Paid plans (₹49 a week, ₹149 a month or ₹799 a year) add exam-security rules such as full screen and app-switch detection, a schedule on exam links, institute branding and Excel export. Google Forms is also free but has no timer or negative marking without add-ons.',
            },
            {
                q: 'How do students join an online exam without an account?',
                a: 'With a join code. The teacher creates a sitting and gets a six-digit code and a QR code. Students open testoza.com/join on any phone, type the code and check in with their name, their roll number, or their roll number and a four-digit PIN from a printed slip. They wait in a lobby until the exam starts.',
            },
            {
                q: 'How can I stop cheating in an online exam?',
                a: 'Make it harder and make it visible. Switch on full screen and app-switch detection with two or three warnings before an automatic submit, turn off copy and paste, shuffle the question order, and release results only when the exam has ended for everyone so answers can’t be passed on. Check in with roll number and PIN so nobody sits the exam for someone else. No browser rule can see a second phone, so supervise the room for exams that decide admissions or jobs.',
            },
            {
                q: 'What happens if a student’s phone dies or the internet goes off during the exam?',
                a: 'In a TestoZa sitting, answers are kept on the phone and saved to the server every 20 seconds. If the phone dies, the student joins again on any device with the same details and continues; the exam room shows “Changed device”. If the signal drops, answers stay on the phone and sync when it returns, and the room shows “No signal” and for how long.',
            },
            {
                q: 'Can I give extra time to one student during an online exam?',
                a: 'Yes. In the exam room, give one candidate 5 or 10 more minutes from the menu next to their name, or everyone still writing 5, 10, 15 or 30 minutes. Their phone shows a message saying the teacher gave them more time, and their countdown updates.',
            },
            {
                q: 'Can I conduct an online exam on mobile phones?',
                a: 'Yes, and in India that is the usual case. The exam screen fits a phone, with the question palette behind a round button, and candidates need only a browser. The teacher can also run the whole exam from a phone: create the sitting, show the code, start it, watch the room and send the rank list.',
            },
            {
                q: 'How long should an online exam be?',
                a: 'National exams give between 36 seconds (SSC CGL Tier 1) and about 2.4 minutes (JEE Main) per question. For a class test, a minute per one-mark question plus five minutes is a reasonable start, with two to three minutes for each numerical problem. Reading on a phone is slower than on paper, so err on the side of more time or fewer questions.',
            },
            {
                q: 'Should students see their results immediately after an online exam?',
                a: 'For practice tests, yes. For a timed exam taken by a whole batch, no: if early finishers can see answers, the students still writing can too. Release results when the exam ends, which is TestoZa’s recommended setting, or by hand after you have checked the questions most students got wrong.',
            },
            {
                q: 'Can I conduct an online exam with Google Forms?',
                a: 'For a short practice quiz, yes. Forms has a quiz mode with an answer key and automatic grading. It has no built-in timer or negative marking, its locked mode works only on school-managed Chromebooks, and there is no lobby, live monitoring or rank list, so timed exams with negative marking are better run on an exam platform.',
            },
            {
                q: 'Can I run the same exam for different batches?',
                a: 'Yes. In TestoZa, one paper can be given to many batches as separate sittings, each with its own code, time, check-in rule and rank list, for example Batch A on Monday and Batch B on Thursday. Absentees can be given a re-test sitting with one tap.',
            },
            {
                q: 'Does TestoZa record the student’s camera or screen?',
                a: 'No. TestoZa doesn’t use the camera, microphone or screen recording. Its exam rules work inside the browser: full screen, app and tab switch detection with a warning limit, copy and paste off, and the back button blocked. For exams that need camera proctoring, use a supervised room or a dedicated proctoring service.',
            },
        ],

        closingTitle: 'Run your next exam this way',
        closing: [
            html(`
<p>Start with whatever you have this week:</p>
<div class="co-paths">
<a class="co-path" href="/generate-with-ai" data-icon="doc"><span class="co-path-who">Paper on PDF or paper?</span><span class="co-path-what">Turn it into an online test with AI</span></a>
<a class="co-path" href="/exams" data-icon="key"><span class="co-path-who">Paper ready?</span><span class="co-path-what">Give it to a batch with a join code</span></a>
<a class="co-path" href="/user-guide/live-exam-sessions" data-icon="layers"><span class="co-path-who">Want the details?</span><span class="co-path-what">Read how join codes and the exam room work</span></a>
</div>
<p>Related reading: <a href="/cbt-exam-software">CBT exam software</a>, <a href="/ai-test-generator">the AI test generator</a>, <a href="/moodle-alternative">Moodle alternatives</a>, <a href="/best-online-test-platform">how to choose an online test platform</a>, <a href="/online-test-for-coaching">TestoZa for coaching institutes</a> and <a href="/pricing">pricing</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Exam patterns',
                links: [
                    { label: 'NEET-UG (NTA)', href: 'https://neet.nta.nic.in/' },
                    { label: 'JEE Main (NTA)', href: 'https://jeemain.nta.nic.in/' },
                    { label: 'CUET-UG (NTA)', href: 'https://cuet.nta.nic.in/' },
                    { label: 'SSC Combined Graduate Level', href: 'https://ssc.gov.in/' },
                ],
            },
            {
                label: 'Google Forms',
                links: [
                    { label: 'Locked mode for quizzes on managed Chromebooks (Google)', href: 'https://blog.google/products-and-platforms/products/education/get-quizzing-locked-mode-and-grade-away-classroom/' },
                    { label: 'Make a quiz with Google Forms (Google Help)', href: 'https://support.google.com/docs/answer/7032287' },
                ],
            },
            {
                label: 'Phones in India',
                links: [{ label: 'Statcounter, mobile operating systems in India', href: 'https://gs.statcounter.com/os-market-share/mobile/india' }],
            },
            {
                label: 'TestoZa',
                links: [
                    { label: 'Live exams with join codes (user guide)', href: 'https://testoza.com/user-guide/live-exam-sessions' },
                    { label: 'Pricing', href: 'https://testoza.com/pricing' },
                ],
            },
        ],
    },
};
