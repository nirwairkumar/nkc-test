/**
 * testoza.com/prevent-cheating-in-online-exams — how candidates actually cheat in online
 * exams, what a browser can and can't notice (with a demo that watches the reader's own
 * tab switches), exam rules, paper design, identity, leaks, AI, exam day, checking the
 * results for copying, setups by exam, webcam proctoring, Google Forms, mistakes and
 * honest limits. Written for exam controllers in schools, coaching institutes, colleges
 * and recruiters, with TestoZa as the worked example.
 *
 * Outside facts (sources in `sources`, checked 4 October 2026):
 *   - Newton & Essex, Journal of Academic Ethics (2024): 19 studies, 25 samples, 4,672
 *     participants; 44.7% admitted cheating in online summative exams; 29.9% before the
 *     pandemic, 54.7% during it.
 *   - Chan & Ahn, PNAS (2023): >2,000 students, 18 Iowa State courses; unproctored online
 *     exam scores tracked in-person scores closely. Newton's PNAS letter disputes that this
 *     means little cheating; the authors' reply allows cheating was rare or ineffective.
 *   - Cotarlan & Lancaster, IJEI (2021): Chegg requests in five STEM subjects up 196.25%
 *     (Apr–Aug 2020 vs Apr–Aug 2019); exam-style questions answered within an exam's time.
 *   - Klijn, Alaoui & Vorsatz, International Review of Economics Education (2024): field
 *     experiment, 2, 4 or 6 versions per problem; later-round students finished problems
 *     19.5% faster (answers circulating) but scored no higher; a few versions can blunt
 *     cheating.
 *   - Scarfe et al., PLOS ONE (2024): GPT-4 answers for 33 fake students in unsupervised
 *     take-home exams at Reading; 94% undetected; higher grades than real students in
 *     83.4% of cases.
 *   - OpenAI withdrew its AI text classifier on 20 July 2023 for low accuracy (26% of AI
 *     text caught, 9% of human text wrongly flagged in its own evaluation).
 *   - Public Examinations (Prevention of Unfair Means) Act, 2024: 3–5 years and up to
 *     ₹10 lakh; service providers up to ₹1 crore; organised crime 5–10 years and at least
 *     ₹1 crore. Covers UPSC, SSC, RRBs, IBPS, NTA and central government recruitment.
 *   - Page Visibility (MDN): a page is "visible" while at least partly visible; hidden on a
 *     tab switch, minimised window or screen off. Fullscreen API: not on iPhone Safari
 *     (Apple, Developer Forums, Dec 2024); iPads have it.
 *   - Google Forms locked mode: Google Workspace for Education + school-managed Chromebooks.
 *
 * TestoZa claims checked against the code on 4 October 2026 (see cheatingData.ts too):
 *   - Exam rules on the paper (TestSettingsPanel): Force Full Screen, Tab/App Switch
 *     Detection, violation action (warn only / Strict / 2–5 warnings then submit), Disable
 *     Copy/Paste, Disable Right Click, Block Back Button, Disable Exit Button, Shuffle
 *     Questions (order only, per candidate). Paid plans ("Advance Test Environment"),
 *     from ₹49 a week. Violations count only in conducted exams (live link or sitting).
 *     Fixed with this guide: Strict submits at the first violation (was warn-only), the
 *     warning counter shows the limit set (was always "/3"), and full screen is skipped
 *     where the browser can't do it (iPhone) instead of trapping the candidate.
 *   - Detection: document visibilitychange (hidden) and fullscreenchange/resize only;
 *     not window blur. So split screen, floating windows, overlays aren't counted.
 *   - Answer key: stripped from every paper sent to candidates; marked on the server;
 *     available to a candidate only after they submit and, on a scheduled exam, after the
 *     end time (routers/tests/read.py). Sittings never send it (join.py strip_answer_key).
 *   - Sittings: roll / roll + PIN check-in, one device per seat ("Changed device"), lobby,
 *     late entry, server deadline, answers saved every 20 s, one submission per candidate,
 *     results immediate / when the exam ends / when I release; exam room "Need a look"
 *     (no signal, warnings, changed device); warnings also in the Excel export.
 *   - On an exam link, the rules act on the candidate's screen, but warning counts are
 *     not shown to the examiner (only sittings report them). Say so.
 *   - NOT in the product: webcam or microphone proctoring, screen recording, a lockdown
 *     browser, question pools / per-candidate versions, option shuffling, answer-
 *     similarity reports, IP checks. "Single attempt" on links is checked only for
 *     signed-in users; "strict timer" is stored but not enforced. Don't claim them.
 */
import { PREVENT_CHEATING_META } from './meta';
import { EXAM, METHODS, METHOD_GROUPS, STAKES, VERDICT_LABEL, setupFor } from './cheatingData';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const METHOD_ROWS = METHOD_GROUPS.map(
    (group) =>
        `<tr class="pc-table-group"><th colspan="4" scope="colgroup">${group}</th></tr>\n` +
        METHODS.filter((m) => m.group === group)
            .map((m) => `<tr><th scope="row">${m.name}</th><td data-label="At home">${VERDICT_LABEL[m.verdict.home]}</td><td data-label="In a supervised room">${VERDICT_LABEL[m.verdict.room]}</td><td data-label="What to do">${m.fix}</td></tr>`)
            .join('\n'),
).join('\n');

const METHODS_FALLBACK = `
<p>Sixteen ways candidates cheat in online exams, grouped as looking it up, getting help, getting the answers early and gaming the test, with what happens to each at home and in a supervised room, and what to do about it:</p>
<div class="pc-table-wrap"><table class="pc-table pc-table--methods">
<thead><tr><th scope="col">Method</th><th scope="col">At home</th><th scope="col">In a supervised room</th><th scope="col">What to do</th></tr></thead>
<tbody>
${METHOD_ROWS}
</tbody>
</table></div>`;

const SANDBOX_FALLBACK = `
<p>A working copy of TestoZa’s exam screen that watches this page the way a live exam watches a candidate’s phone. Choose the rules (force full screen, app and tab switch detection, what happens after violations, copy and paste off, right-click off), press Start, then try to cheat: switch to another tab or app and come back, copy the question, right-click it, or leave full screen. A live log shows every signal the browser gave the page, which ones TestoZa counts (the page being hidden, leaving full screen), which it blocks (copy, paste, right-click) and which it can’t act on (the window losing focus, which is what split screen and floating windows produce). Warnings appear on the exam screen as they do in the product (“Warning 1/3: Tab Switching / Navigation is not allowed!”), reach the examiner’s exam room row a moment later, and past the limit the paper submits itself. Nothing is sent anywhere.</p>`;

const COPY_FALLBACK = `
<p>A sample batch of eight candidates who answered the same twelve questions (+${EXAM.right} / −${EXAM.wrong}). Pick two candidates and the check sorts their answers into the same right answers, the same wrong answers and different wrong answers. In the sample, Aisha Khan and Dev Sharma share eleven right answers, which proves nothing: strong candidates agree because they are right. Rohan Verma and Kabir Singh share six identical wrong answers; if wrong answers were spread evenly over the three wrong options, two candidates working alone would match on all six about once in 729 tries. They also finished in 19 and 21 minutes against a batch average above 30, and both had app-switch warnings. That pattern is worth a conversation, not a verdict.</p>`;

const PLANNER_ROWS = STAKES.map((s) => {
    const home = setupFor(s.id, 'home');
    const room = setupFor(s.id, 'room');
    return `<tr><th scope="row">${s.label}</th><td data-label="Check-in">${home.checkIn}</td><td data-label="Exam rules">${home.rules.join(', ')}; ${home.policy.toLowerCase()}</td><td data-label="Results">${home.results}</td><td data-label="At home">${home.verdict}</td><td data-label="In a room">${room.room}</td></tr>`;
}).join('\n');

const PLANNER_FALLBACK = `
<p>Pick the kind of exam and where candidates sit, and the planner lists the setup: how candidates check in, which exam rules to turn on, what happens after violations, when results appear, how to write the paper and who should be in the room.</p>
<div class="pc-table-wrap"><table class="pc-table pc-table--setups">
<thead><tr><th scope="col">Exam</th><th scope="col">Check-in</th><th scope="col">Exam rules</th><th scope="col">Results</th><th scope="col">If it’s taken at home</th><th scope="col">In a supervised room</th></tr></thead>
<tbody>
${PLANNER_ROWS}
</tbody>
</table></div>`;

export const PREVENT_CHEATING_ONLINE_EXAMS: Guide = {
    meta: PREVENT_CHEATING_META,
    body: {
        intro: [
            html(`
<p>Every teacher who has run an online test knows the moment: the marks come in, and the candidate who has never crossed 40% has scored 92, in eleven minutes. Then a screenshot of question 14 turns up in the class WhatsApp group, timestamped twenty minutes into the exam.</p>
<p>Cheating in online exams is common, and most of it isn’t clever. It’s a quick search, a chatbot, a friend on the phone, an answer key that reached the browser, or a screenshot passed round while others are still writing. Almost all of it can be made harder, made visible, or made pointless. None of it can be made impossible on a phone in a candidate’s bedroom, and anyone who tells you otherwise is selling something.</p>
<p>This guide is for whoever has to make an online exam fair: a school, a coaching institute, a college department or a recruiter. It covers how candidates actually cheat, what software can and can’t notice, and the things that work better than software: how you write the paper, how candidates check in, when answers are released and how you read the results. TestoZa is the worked example, because every rule it describes can be tried on this page. In fact, once you press Start in the demo below, this page will notice when you switch tabs, just as an exam would.</p>
`),
        ],

        answer: 'To prevent cheating in online exams, combine four layers. First, the paper: a realistic time limit, questions that need working rather than recall, a shuffled order, and two versions for candidates who sit together. Second, identity: candidates check in with a roll number and a PIN, on one device at a time. Third, exam rules: full screen, app-switch detection with two or three warnings before an automatic submit, and copy, paste and right-click turned off. Fourth, release: no answers or results until the exam has ended for everyone, and an answer key that never reaches the browser. Then read the signals: warnings, changed devices, unusually fast papers and identical wrong answers. In TestoZa, join codes, PINs, the live exam room and results are free; the exam-security rules come with paid plans from ₹49 a week. Be realistic about the limit: no web page can see a second phone or a friend in the room, so exams that decide admissions, jobs or scholarships belong in a supervised room, with the rules on as well.',

        sections: [
            {
                id: 'how-common',
                title: 'How common is cheating in online exams?',
                tocLabel: 'How common',
                kicker: 'The problem',
                blocks: [
                    html(`
<p>More common than most teachers assume, and it rose sharply when exams moved online. The best summary so far is a 2024 systematic review in the <em>Journal of Academic Ethics</em> by Philip Newton and Keioni Essex, which pooled 19 studies covering 4,672 university students. <strong>44.7% admitted to cheating in online exams.</strong> Before the pandemic the figure was 29.9%; during it, 54.7%. Those are students who admitted it in a survey, so the true numbers are unlikely to be lower.</p>
<p>The tools changed too. When Thomas Lancaster and Codrin Cotarlan tracked Chegg, a homework-help site, in five STEM subjects, the questions students posted rose by 196% between April–August 2019 and the same months of 2020, and exam-style questions were being answered within the length of an exam. Today the same request goes to a chatbot, which answers in seconds and never sleeps.</p>
<h3>Does cheating actually change the marks?</h3>
<p>Less than you might fear, and that matters for how you respond. A 2023 study in <em>PNAS</em> by Jason Chan and Dahwi Ahn compared more than 2,000 students’ unproctored online exams with their earlier in-person exams across 18 courses and found the scores tracked each other closely. The authors read that as evidence that cheating was either rare or didn’t help much; Newton argued in reply that surveys show it isn’t rare. Both readings lead to the same practical point: <strong>a well-written exam makes most cheating useless</strong>, because looking an answer up takes time the paper doesn’t give, and a copied answer to a question you rewrote is wrong.</p>
<h3>When cheating is a crime</h3>
<p>For India’s big recruitment and entrance exams it now is. The Public Examinations (Prevention of Unfair Means) Act, 2024 covers exams run by the UPSC, SSC, the Railway Recruitment Boards, IBPS, the NTA and central government departments. Using unfair means carries three to five years in prison and a fine of up to ₹10 lakh; organised cheating, five to ten years and at least ₹1 crore. The Act doesn’t cover a school’s unit test or a coaching institute’s weekly mock. For those, prevention is up to you, and it starts with knowing what you are preventing.</p>
`),
                ],
            },
            {
                id: 'methods',
                title: 'How candidates cheat: 16 ways, and what stops each',
                tocLabel: 'How they cheat',
                kicker: 'The methods',
                blocks: [
                    html(`
<p>Ask candidates how they cheat (researchers have) and the same handful of methods come up. They fall into four groups:</p>
<ul class="pc-checks">
<li><strong>Looking it up:</strong> another tab, a chatbot, Google Lens, a second phone, notes on the desk.</li>
<li><strong>Getting help:</strong> the class group, a friend in the room, someone else sitting the test, a helper watching through screen sharing.</li>
<li><strong>Getting the answers early:</strong> early finishers passing answers on, an answer key readable in the page, a leaked paper.</li>
<li><strong>Gaming the test:</strong> a second attempt under another name, a “network failure” to get more time, copying the question into another app.</li>
</ul>
<p>The important distinction is where the exam happens. In a supervised room, a person stops most of these. At home, some are blocked by the exam software, some are flagged to you, and some leave no trace on the exam phone at all. Choose a method and a place to see which:</p>
`),
                    { type: 'widget', widget: 'cheat-methods', fallbackHtml: METHODS_FALLBACK },
                    html(`
<p>Two things stand out. First, the “not seen” column is about hardware, not software: a second phone, a friend, a book. No exam app on the candidate’s own phone can see them, whatever its marketing says. Second, more than half the list is stopped not by watching the candidate but by how the exam is set up: who can get in, when the questions are sent, when the answers are released. That part is free, and it’s where to start.</p>
`),
                ],
            },
            {
                id: 'browser',
                title: 'What a web browser can and can’t see',
                tocLabel: 'What a browser sees',
                kicker: 'Try it',
                blocks: [
                    html(`
<p>An online exam runs in a browser, and a browser tells a web page very little about the device it runs on. That is deliberate: it protects everyone from websites that would like to know more. Here is everything an exam page can learn:</p>
<ul class="pc-checks">
<li><strong>The page was hidden.</strong> When the candidate switches tab, opens another app, goes to the home screen or locks the phone, the browser marks the page hidden. This is what “tab and app switch detection” watches.</li>
<li><strong>Full screen was left.</strong> If the exam asked for full screen, the page is told when the candidate leaves it.</li>
<li><strong>Something was copied, pasted or right-clicked inside the page.</strong> The page can stop it, and show a message.</li>
<li><strong>The window lost focus.</strong> The candidate clicked somewhere else: another window, the address bar, a notification. This happens so often for innocent reasons that TestoZa doesn’t count it.</li>
</ul>
<p>And here is what it can’t learn: a second phone or laptop, a person in the room, books on the desk, a screenshot being taken, a screen being shared, which other apps are installed or running, or anything drawn over the page without hiding it. A page that is still partly on screen counts as visible, so split screen, a floating chat bubble, picture-in-picture or a second monitor go unreported.</p>
<p>Try it. This is TestoZa’s exam screen, and once you press Start it watches this page exactly as a live exam watches a candidate’s phone. Switch to another tab and come back, copy the question, right-click it, or leave full screen, and watch the log: it shows every signal your browser sent, which ones are counted, and what reaches the examiner.</p>
`),
                    { type: 'widget', widget: 'cheat-sandbox', fallbackHtml: SANDBOX_FALLBACK },
                    html(`
<p>Notice what happened when you clicked outside the browser without switching tabs: the window lost focus, and nothing was counted. That is the honest edge of browser-based proctoring, and it’s why the rest of this guide matters more than any single switch.</p>
`),
                ],
            },
            {
                id: 'rules',
                title: 'Exam rules: what each one stops, and how to set it',
                tocLabel: 'Exam rules',
                kicker: 'Settings',
                blocks: [
                    html(`
<p>In TestoZa the rules sit on the paper, under Settings → Proctoring &amp; Security, and apply whenever it runs as a live exam: through an exam link or as a sitting with a join code. They come with the paid plans (from ₹49 a week). Each one is worth understanding before you turn it on:</p>
<div class="pc-table-wrap"><table class="pc-table pc-table--rules">
<thead><tr><th scope="col">Rule</th><th scope="col">What it does</th><th scope="col">What it doesn’t stop</th><th scope="col">Turn it on for</th></tr></thead>
<tbody>
<tr><th scope="row">Force full screen</th><td data-label="What it does">The exam opens in full screen; leaving it counts as a violation and the candidate is asked to return.</td><td data-label="Doesn’t stop">A second device. Not available on iPhones, where TestoZa skips it.</td><td data-label="Use for">Mocks and term exams on computers and Android phones.</td></tr>
<tr><th scope="row">Tab and app switch detection</th><td data-label="What it does">Leaving the exam (another tab or app, the home screen, a locked screen) counts as a violation.</td><td data-label="Doesn’t stop">Split screen, overlays, a second device.</td><td data-label="Use for">Every exam that counts.</td></tr>
<tr><th scope="row">After violations</th><td data-label="What it does">Warn only; Strict (submit at the first); or 2 to 5 warnings, then submit automatically.</td><td data-label="Doesn’t stop">Nothing by itself: it decides what a violation costs.</td><td data-label="Use for">2 or 3 warnings for phones; Strict only on lab computers.</td></tr>
<tr><th scope="row">Disable copy/paste</th><td data-label="What it does">Copying, cutting and pasting in the exam do nothing, with a message.</td><td data-label="Doesn’t stop">Retyping or photographing the question.</td><td data-label="Use for">Every exam that counts.</td></tr>
<tr><th scope="row">Disable right click</th><td data-label="What it does">No context menu, so no “Search Google for…” on a computer.</td><td data-label="Doesn’t stop">Keyboard shortcuts on the rest of the computer.</td><td data-label="Use for">Computer labs.</td></tr>
<tr><th scope="row">Block back button</th><td data-label="What it does">Back doesn’t leave the exam page.</td><td data-label="Doesn’t stop">Anything deliberate; it prevents accidents.</td><td data-label="Use for">Phones, where a swipe can go back.</td></tr>
<tr><th scope="row">Disable exit button</th><td data-label="What it does">Hides Exit, so the only way out is Submit.</td><td data-label="Doesn’t stop">Closing the browser.</td><td data-label="Use for">Supervised exams.</td></tr>
<tr><th scope="row">Shuffle questions</th><td data-label="What it does">Each candidate gets the questions in a different order.</td><td data-label="Doesn’t stop">Sharing answers by the question’s words.</td><td data-label="Use for">Any exam taken at the same time by people who can talk.</td></tr>
</tbody>
</table></div>
<h3>Choosing what happens after a violation</h3>
<p>This is the setting people get wrong most often, in both directions. Warn only is too soft for an exam that counts: a candidate can leave twenty times and still submit. Strict is too harsh for phones, because an incoming call, a low-battery pop-up or a payment notification can take a phone out of the browser for a second, and the paper is gone. For candidates on their own phones, <strong>two or three warnings, then an automatic submit</strong> is the fair middle: a genuine accident costs a warning, a habit costs the paper. Keep Strict for lab computers, where nothing else should ever come to the front.</p>
<p>Tell candidates the rule before the day, with the number. A warning that comes as a surprise feels like a trap; a rule announced in advance is just a rule, and most candidates who know it never test it.</p>
<h3>iPhones and full screen</h3>
<p>Safari on iPhone doesn’t let any web page go full screen; only videos can (iPads can). On an iPhone TestoZa therefore skips the full-screen rule rather than block the candidate, and everything else still applies, including app-switch detection. If full screen matters for an exam, hold it on computers or Android phones.</p>
<p class="pc-note"><strong>Where the warnings go.</strong> In a sitting with a join code, each warning reaches your exam room within seconds, next to the candidate’s name, and is in the results and the Excel export. On an exam link the rules still act on the candidate’s screen (the warning, the automatic submit), but the count isn’t shown to you. For any exam where you want to see who was warned, run it as a sitting.</p>
`),
                ],
            },
            {
                id: 'paper',
                title: 'Write a paper that makes cheating pointless',
                tocLabel: 'The paper',
                kicker: 'The paper',
                blocks: [
                    html(`
<p>The cheapest anti-cheating tool is the question paper. If looking an answer up takes longer than working it out, and a copied answer is likely to be wrong, most cheating stops paying, and you never need to catch anyone.</p>
<ol class="pc-steps">
<li><strong>Give the real exam’s time, not more.</strong> JEE Main allows about 2 minutes 24 seconds a question, NEET 1 minute, SSC CGL 36 seconds. A candidate who spends 90 seconds searching each question can’t finish. Generous time is the single biggest gift to cheaters.</li>
<li><strong>Ask for working, not facts.</strong> “Which organ makes insulin?” is one search away. “A patient’s blood sugar stays high after a meal although insulin levels are normal; which step is failing?” needs understanding, and a search returns ten different guesses. For maths and physics, numerical answers (typed, not chosen) can’t be guessed from four options.</li>
<li><strong>Make two versions.</strong> In a 2024 field experiment by Flip Klijn and colleagues, students who met a problem later in the exam finished it 19.5% faster than those who met it first, which means answers were circulating, yet they scored no better, because each had one of several versions. Two versions with different numbers or a different order of options do most of that work. In TestoZa, put the two halves of a batch on separate batch lists, each with its own sitting and paper; roll-number check-in keeps everyone in their own sitting.</li>
<li><strong>Shuffle the order.</strong> When candidates who can talk sit at the same time, “what’s 14?” should mean a different question to each of them. Shuffling makes the group chat slow and confusing, not impossible, which is often enough.</li>
<li><strong>Keep negative marking if the real exam has it.</strong> A candidate who isn’t sure a shared answer is right has a reason not to use it.</li>
<li><strong>Never reuse a paper that has been out.</strong> Questions from last week’s test are in someone’s gallery. Re-tests for absentees deserve a fresh paper too.</li>
</ol>
<p>None of this makes a paper harder for honest candidates. It makes it what an exam is supposed to be: a measure of what someone can do in the time, alone.</p>
`),
                ],
            },
            {
                id: 'identity',
                title: 'Make sure the right person is writing',
                tocLabel: 'Identity',
                kicker: 'Identity',
                blocks: [
                    html(`
<p>The most damaging kind of cheating isn’t a looked-up answer. It is someone else sitting the whole exam, and it is the one that a name typed into a box does nothing about. Check-in is where you stop it.</p>
<p>A TestoZa sitting offers three ways to check in, chosen per exam:</p>
<ul class="pc-checks">
<li><strong>Name.</strong> Quick, and fine for a class quiz. Anyone can type any name.</li>
<li><strong>Roll number.</strong> The candidate must be on the batch list you loaded. Better, but anyone who knows a roll number can use it.</li>
<li><strong>Roll number and PIN.</strong> Each candidate has a four-digit PIN printed on a slip you hand out (the slip’s message is yours to write). Without the slip, nobody gets in; wrong PINs are limited to eight tries in ten minutes per candidate.</li>
</ul>
<p>Two more protections run quietly. A seat can be open on one device at a time: if the same roll number joins from a second phone, the first is logged out, the exam continues on the new phone with the answers saved so far (they are saved every 20 seconds), and your exam room shows <em>Changed device</em> next to the name. And each candidate can submit once; the database refuses a second paper, so a practice run under the same roll number isn’t possible.</p>
<p>What check-in can’t do is stop a candidate handing their own slip to someone else at home. For exams where identity is the whole point (recruitment, scholarships, anything with money or a job attached) check identity at the door of a supervised room: the slip and a photo ID, or the admit card against the face.</p>
<p class="pc-note"><strong>For recruiters.</strong> Load candidates’ application numbers as roll numbers, print PIN slips with the admit card or send them privately, and treat a home-based online test as a shortlist, not a decision. The final round should be one where you can see who is answering.</p>
`),
                ],
            },
            {
                id: 'leaks',
                title: 'Stop answers leaking while others are still writing',
                tocLabel: 'Leaks',
                kicker: 'Release',
                blocks: [
                    html(`
<p>The fastest-spreading cheating isn’t done during the exam by the cheater. It is done by an honest candidate who finishes early, sees the answer key, and is asked for it by friends still writing. Close that door and a whole category disappears:</p>
<ol class="pc-steps">
<li><strong>The answer key must never reach the browser.</strong> In some quiz tools the correct answers are sent to the phone along with the questions, where anyone who opens the browser’s developer tools can read them. TestoZa removes the answers before sending the paper and marks it on the server, so there is nothing to read, and a score edited on the phone is ignored. Ask any tool you use; if a quiz can mark an answer with the internet switched off, the key is on the phone.</li>
<li><strong>Release results when the exam ends for everyone.</strong> In a sitting, results can appear straight after submitting, when the exam ends, or when you release them. “When the exam ends” is the right default for anything that counts. Candidates in a sitting never see the answer key at all, and they can look up their result later from any phone with the same details.</li>
<li><strong>Give exam links a closing time.</strong> On a scheduled exam link, candidates who finish can’t see the key until the end time has passed.</li>
<li><strong>Don’t send the paper early.</strong> In a sitting, the questions are sent only when the exam starts; until then candidates wait in a lobby that opens 30 minutes before, and the join code works only while its exam is open.</li>
<li><strong>Close late entry.</strong> Someone who joins 40 minutes in may already have the answers. Set a late-entry window, five or ten minutes, after which new candidates can’t join.</li>
</ol>
`),
                ],
            },
            {
                id: 'ai',
                title: 'ChatGPT and AI: the new problem',
                tocLabel: 'AI tools',
                kicker: 'AI',
                blocks: [
                    html(`
<p>AI changed the arithmetic of cheating. A search returns pages to read; a chatbot returns the answer, with working, in seconds. In a 2024 study published in <em>PLOS ONE</em>, Peter Scarfe and colleagues at the University of Reading submitted answers written entirely by GPT-4 for 33 made-up students in real, unsupervised take-home psychology exams. Markers didn’t know. <strong>94% of the AI answers went unnoticed, and in 83.4% of cases they scored higher than real students’ work.</strong></p>
<p>Don’t expect a detector to save you. OpenAI withdrew its own AI-text classifier in July 2023 because it wasn’t accurate enough: in OpenAI’s own test it caught 26% of AI-written text and wrongly labelled 9% of human writing as AI. Accusing a candidate on the strength of a detector score is unfair to the honest ones and easy for the dishonest ones to argue with.</p>
<p>What works against AI is the same as what works against everything else, done more firmly:</p>
<ul class="pc-checks">
<li><strong>Keep the candidate inside the exam.</strong> On a single phone, asking a chatbot means leaving the exam, which app-switch detection counts. Copy off means retyping the question, which takes time.</li>
<li><strong>Take the slack out of the clock.</strong> AI is fast, but copying a question into it and the answer back isn’t, and a tight paper has no spare minutes.</li>
<li><strong>Write questions an AI handles badly in a hurry:</strong> a figure or a graph to read, data from your own class, a multi-step numerical answer, a question that depends on a diagram in your notes.</li>
<li><strong>Move high-stakes exams into a room.</strong> A second phone with a chatbot is the one thing no exam software can see.</li>
<li><strong>Follow up surprising scores in person.</strong> Five minutes of “talk me through question 7” is fairer and more reliable than any detector.</li>
</ul>
`),
                ],
            },
            {
                id: 'exam-day',
                title: 'On the day: watching the exam room',
                tocLabel: 'Exam day',
                kicker: 'Exam day',
                blocks: [
                    html(`
<p>Exam-day supervision is mostly about noticing patterns early enough to act. In a TestoZa sitting, the exam room shows every candidate as they write: answered so far, time left, and three signals gathered under <em>Need a look</em>:</p>
<ul class="pc-checks">
<li><strong>No signal.</strong> The phone hasn’t checked in for a while; the room shows for how long (“No signal for 3:20”). Answers are still on the phone and sync when it reconnects.</li>
<li><strong>Warnings.</strong> How many times the candidate left the exam or full screen.</li>
<li><strong>Changed device.</strong> The same roll number continued on another phone or computer.</li>
</ul>
<p>Read them together, not one at a time. One warning at minute 3 is a notification; six warnings in the last ten minutes is a habit. A changed device after a phone died fits a candidate who says so; a changed device with no gap in the answers doesn’t. A long “No signal” before a burst of correct answers is worth a look; the same gap before a slow, honest finish isn’t.</p>
<p>You can act from the room: give one candidate or everyone extra time (their phone shows a message and the countdown updates), ask a candidate to submit now, or remove someone from the exam. Give extra time only when the room shows a real gap, and write down why. A fair exam is one where the same story gets the same answer.</p>
<p>If candidates are in a hall or lab, the room still needs people. Phones that aren’t being used for the exam go in bags, desks are clear, and someone walks the rows rather than sitting at the front. The software tells you who to watch; a person stops it.</p>
`),
                ],
            },
            {
                id: 'after',
                title: 'After the exam: how to spot copying in the results',
                tocLabel: 'Spot copying',
                kicker: 'After',
                blocks: [
                    html(`
<p>Some cheating only shows in the marks. Four signals are worth checking before you publish a rank list:</p>
<ol class="pc-steps">
<li><strong>Identical wrong answers.</strong> Two good candidates share right answers because they are right; that proves nothing. Two candidates who pick the same wrong option on the same questions, again and again, are the classic sign of copying. Exam boards use statistics built on exactly this idea.</li>
<li><strong>Speed that doesn’t fit the score.</strong> A full mock finished in half the time with a high score, or a low score finished in half the time with the same wrong answers as a friend.</li>
<li><strong>Warnings and changed devices</strong> from the exam room, which are in the results and the Excel export of a sitting.</li>
<li><strong>A jump against the candidate’s own history.</strong> 38%, 41%, 36%, then 94% deserves a conversation.</li>
</ol>
<p>TestoZa doesn’t compare candidates’ answer sheets for you; on an exam link you can open each candidate’s detailed result and compare the two you suspect. Here is the check on a sample batch: choose two candidates and see where their answers agree.</p>
`),
                    { type: 'widget', widget: 'cheat-copy-check', fallbackHtml: COPY_FALLBACK },
                    html(`
<p>The arithmetic is simple and worth knowing. When two candidates both get a question wrong, there are usually three wrong options to pick from, so honest candidates match about one time in three, and a little more often when one wrong option is a popular trap. Two matches mean nothing. Six matching wrong answers out of six happens by chance about once in 729 pairs, and in a batch of 40 there are 780 pairs, so even this is a reason to talk to the candidates, not proof. Ask them to explain two of the shared answers. Copied answers rarely come with reasons.</p>
`),
                ],
            },
            {
                id: 'setups',
                title: 'The right setup for your exam',
                tocLabel: 'Your setup',
                kicker: 'Setups',
                blocks: [
                    html(`
<p>A class quiz doesn’t need the security of a scholarship test, and treating it as if it did makes honest candidates miserable. Pick the kind of exam and where candidates will sit:</p>
`),
                    { type: 'widget', widget: 'cheat-planner', fallbackHtml: PLANNER_FALLBACK },
                    html(`
<p>The pattern is that security grows with what the result decides. Practice can be open and friendly; a rank list that goes to parents needs roll numbers and released results; anything with money, admission or a job attached needs a room you can see.</p>
`),
                ],
            },
            {
                id: 'webcam',
                title: 'Webcam proctoring and lockdown browsers: worth it?',
                tocLabel: 'Webcam proctoring',
                kicker: 'Proctoring',
                blocks: [
                    html(`
<p>Two heavier tools come up whenever online exams and cheating are discussed: remote proctoring, which records candidates through the webcam and microphone and flags movements for review, and lockdown browsers, special apps that take over a computer so nothing else can run.</p>
<p>Both do something real, and both have costs that fall on candidates. Webcam proctoring needs a working camera, a quiet private room and a fast enough connection, which many Indian candidates on shared phones don’t have; it records people in their homes, which raises consent and data-protection questions; and a flagged glance away still needs a person to judge it. A lockdown browser needs an install on every computer and doesn’t exist for most phones.</p>
<p>TestoZa doesn’t do either: its exams don’t use the camera or microphone, don’t record the screen, and need nothing installed. Its approach is the one described above: a browser exam with rules, check-in, release and an exam room, made for candidates on ordinary phones. If you need eyes on candidates for a home exam, a video call with cameras on during the exam (one invigilator watching a gallery of faces) adds supervision without new software. For exams that decide something, a supervised room is still cheaper, fairer and more reliable than any camera.</p>
`),
                ],
            },
            {
                id: 'google-forms',
                title: 'Can you stop cheating in Google Forms?',
                tocLabel: 'Google Forms',
                kicker: 'Google Forms',
                blocks: [
                    html(`
<p>Many first online exams are Google Forms quizzes, and for a low-stakes quiz that’s fine. For anything that counts, know its limits. Forms has a <em>locked mode</em> that stops candidates opening other tabs or apps, but it only works with a Google Workspace for Education account and school-managed Chromebooks; on candidates’ own phones and laptops it isn’t available. There is no timer without an add-on, so candidates can take as long as they like. Questions can be shuffled, and “limit to one response” needs candidates to sign in with a Google account.</p>
<p>Most of all, nothing in a form tells you who left the page, and results are often shared as soon as the first candidate submits. If you have outgrown that, the steps in this guide work in any exam tool that has a timer, app-switch detection, check-in and a results release. TestoZa can import an existing paper from a PDF or photos, so moving a Forms quiz across is quick.</p>
`),
                ],
            },
            {
                id: 'mistakes',
                title: 'Ten mistakes that invite cheating',
                tocLabel: 'Mistakes',
                kicker: 'Avoid these',
                blocks: [
                    html(`
<ul class="pc-limits">
<li><strong>Generous time.</strong> Every spare minute is a search. Use the real exam’s time per question.</li>
<li><strong>Showing results the moment the first candidate submits.</strong> Release them when the exam ends for everyone.</li>
<li><strong>Reusing last week’s paper.</strong> It’s in someone’s gallery.</li>
<li><strong>Name-only check-in for an exam that counts.</strong> Use roll numbers, and PINs when it matters.</li>
<li><strong>Strict mode on phones.</strong> A phone call submits an honest candidate’s paper. Use two or three warnings.</li>
<li><strong>Rules that surprise candidates.</strong> Announce the warning limit the day before.</li>
<li><strong>Counting warnings instead of reading them.</strong> One warning is a notification; a pattern is a story.</li>
<li><strong>Recall-only questions in an exam taken at home.</strong> Ask for working, figures and steps.</li>
<li><strong>Treating a detector score as proof.</strong> Talk to the candidate instead.</li>
<li><strong>Ranking, rewarding or hiring on a home exam alone.</strong> Confirm it in a room.</li>
</ul>
`),
                ],
            },
            {
                id: 'limits',
                title: 'What no online exam can stop',
                tocLabel: 'Honest limits',
                kicker: 'Worth knowing',
                blocks: [
                    html(`
<p>Be wary of any tool, including this one, that claims to make online exams cheat-proof. Here is what TestoZa, and every browser-based exam, can’t do:</p>
<ul class="pc-limits">
<li><strong>See another device.</strong> A second phone, laptop or smartwatch is invisible to the exam.</li>
<li><strong>See the room.</strong> A friend, a tutor, notes on the desk. TestoZa’s exams don’t use the camera or microphone.</li>
<li><strong>Notice overlays or split screen.</strong> A page that is still partly visible counts as visible.</li>
<li><strong>Know about screenshots or screen sharing.</strong> Browsers don’t tell web pages.</li>
<li><strong>Go full screen on an iPhone.</strong> Safari on iPhone doesn’t allow it; other rules still apply.</li>
<li><strong>Stop a candidate handing over their own PIN.</strong> Check identity in person when it matters.</li>
<li><strong>Write a different paper for each candidate.</strong> TestoZa shuffles the order of questions, not their options or wording; for two versions, use two sittings.</li>
<li><strong>Compare answer sheets for you.</strong> The copying check above is something you do by hand.</li>
</ul>
<p>What’s left after all that is still a great deal: most casual cheating stopped or flagged, answers that can’t leak, candidates who can’t be impersonated by a stranger, and an exam room that tells you who to look at. For a weekly test or a mock, that is enough. For an exam that decides someone’s future, add a room and a person.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'How do you prevent cheating in online exams?',
                a: 'Use four layers. Write the paper well: a realistic time limit, questions that need working, a shuffled order and two versions for candidates who sit together. Check identity: roll number and PIN, one device per candidate. Turn on exam rules: full screen, app-switch detection with two or three warnings before an automatic submit, copy and paste off. Control release: the answer key never reaches the browser, and results appear only when the exam has ended for everyone. For exams that decide admissions or jobs, add a supervised room.',
            },
            {
                q: 'Can online exams detect cheating?',
                a: 'Partly. A browser-based exam can detect the page being hidden (switching tab or app, the home screen, a locked phone), leaving full screen, and copy, paste or right-click inside the page. It can’t detect a second phone, a person in the room, screenshots, screen sharing, split screen or a floating window. Patterns in the results, such as identical wrong answers or an unusually fast high score, catch some of the rest.',
            },
            {
                q: 'Can teachers see if you switch tabs during an online test?',
                a: 'If the test has tab and app switch detection on, yes. In TestoZa, switching away shows the candidate a warning, counts it, and after the limit set by the examiner submits the paper automatically. In a sitting with a join code, the count appears in the examiner’s exam room within seconds and in the results. Clicking outside the window without leaving the page isn’t counted.',
            },
            {
                q: 'Can an online exam detect a second phone?',
                a: 'No. Nothing on the exam device changes when a candidate uses another phone or laptop, so no browser-based exam can know, whatever it claims. The defences are a tight time limit, questions that can’t be looked up quickly, two versions of the paper, and a supervised room for exams that matter.',
            },
            {
                q: 'How do you stop students using ChatGPT in an online exam?',
                a: 'On a single phone, using ChatGPT means leaving the exam, which app-switch detection counts; with copy and paste off, the question has to be retyped. Keep the time limit tight, ask questions that need a figure, data or several steps, and follow surprising scores with a short oral check. AI detectors aren’t reliable enough to accuse anyone; OpenAI withdrew its own in 2023. For high-stakes exams, use a supervised room, because a chatbot on a second phone is invisible.',
            },
            {
                q: 'Does full screen mode stop cheating in online exams?',
                a: 'It helps on computers and Android phones: leaving full screen to open another window counts as a violation. It doesn’t stop a second device, and Safari on iPhone doesn’t support full screen for web pages at all, so TestoZa skips that rule on iPhones while app-switch detection still works. Use it together with the other rules, not alone.',
            },
            {
                q: 'How many warnings should I allow before auto-submitting?',
                a: 'For candidates on their own phones, two or three. Phones leave the browser for innocent reasons, such as a call or a low-battery message, so one warning (Strict mode) punishes accidents. Warn only is too soft for an exam that counts. Strict is reasonable on lab computers where nothing else should appear. Tell candidates the number before the exam.',
            },
            {
                q: 'How do I stop students sharing answers on WhatsApp during an online exam?',
                a: 'Turn on app-switch detection so leaving the exam for a chat is counted, shuffle the question order so question numbers mean different questions to different candidates, use two versions of the paper for candidates who sit together, and release answers and results only when the exam has ended for everyone. A tight time limit leaves no time to wait for replies.',
            },
            {
                q: 'How do I stop someone else taking the online exam for a student?',
                a: 'Use roll number and PIN check-in: each candidate gets a four-digit PIN on a printed slip, and without it nobody can join. In TestoZa a seat is open on one device at a time, and joining from another device logs the first out and shows “Changed device” in the exam room. At home, nothing stops a candidate handing over their own slip, so check photo ID in a supervised room when identity matters.',
            },
            {
                q: 'Can students see the answers in the page source of an online test?',
                a: 'In some quiz tools, yes: the correct answers are sent to the browser with the questions. In TestoZa they aren’t. Answers are removed before the paper is sent and the paper is marked on the server, so there is nothing to read and a score changed on the phone is ignored. A simple test for any tool: if it can mark an answer with the internet switched off, the key is on the phone.',
            },
            {
                q: 'Is webcam proctoring necessary for online exams?',
                a: 'For most school and coaching tests, no. It needs a camera, a private room and a good connection, records candidates in their homes, and still needs a person to judge every flag. TestoZa’s exams don’t use the camera or microphone. For a home exam that needs supervision, a video call with cameras on works; for exams that decide something, a supervised room is fairer and more reliable.',
            },
            {
                q: 'Is cheating in an online exam a crime in India?',
                a: 'In public examinations, yes. The Public Examinations (Prevention of Unfair Means) Act, 2024 covers exams by the UPSC, SSC, Railway Recruitment Boards, IBPS, NTA and central government departments, with three to five years in prison and a fine of up to ₹10 lakh for unfair means, and five to ten years and at least ₹1 crore for organised cheating. School and coaching tests aren’t covered; their rules are the institution’s own.',
            },
        ],

        closingTitle: 'Run your next exam the fair way',
        closing: [
            html(`
<p>Start with the layers that cost nothing: write the paper for the time, check candidates in with roll numbers, and release results when the exam ends. Then add the rules your exam deserves.</p>
<div class="pc-paths">
<a class="pc-path" href="/generate-with-ai" data-icon="doc"><span class="pc-path-who">Need a paper first?</span><span class="pc-path-what">Make one from a PDF or photos</span></a>
<a class="pc-path" href="/how-to-conduct-online-exam" data-icon="key"><span class="pc-path-who">Running it at a fixed time?</span><span class="pc-path-what">Set up a sitting with a join code</span></a>
<a class="pc-path" href="/pricing" data-icon="shield"><span class="pc-path-who">Want the exam rules?</span><span class="pc-path-what">See the plans, from ₹49 a week</span></a>
</div>
<p>Related reading: <a href="/how-to-conduct-online-exam">how to conduct an online exam</a>, <a href="/user-guide/live-exam-sessions">live exams with join codes</a>, <a href="/cbt-exam-software">CBT exam software</a>, <a href="/moodle-alternative">a Moodle alternative for coaching institutes</a> and <a href="/neet-online-test-software">NEET online test software</a>.</p>
`),
        ],

        sources: [
            {
                label: 'How common cheating is',
                links: [
                    { label: 'Newton & Essex, Journal of Academic Ethics (2024)', href: 'https://link.springer.com/article/10.1007/s10805-023-09485-5' },
                    { label: 'Chan & Ahn, PNAS (2023)', href: 'https://www.pnas.org/doi/10.1073/pnas.2302020120' },
                    { label: 'Newton, PNAS letter (2023)', href: 'https://www.pnas.org/doi/10.1073/pnas.2312978120' },
                    { label: 'Cotarlan & Lancaster, International Journal for Educational Integrity (2021)', href: 'https://edintegrity.biomedcentral.com/articles/10.1007/s40979-021-00070-0' },
                ],
            },
            {
                label: 'Exam design and AI',
                links: [
                    { label: 'Klijn, Alaoui & Vorsatz, International Review of Economics Education (2024)', href: 'https://www.sciencedirect.com/science/article/pii/S1477388024000239' },
                    { label: 'Scarfe et al., PLOS ONE (2024)', href: 'https://doi.org/10.1371/journal.pone.0305354' },
                    { label: 'OpenAI, AI classifier (updated July 2023)', href: 'https://openai.com/index/new-ai-classifier-for-indicating-ai-written-text/' },
                ],
            },
            {
                label: 'Law in India',
                links: [{ label: 'Public Examinations (Prevention of Unfair Means) Act, 2024 (PRS India)', href: 'https://prsindia.org/billtrack/the-public-examinations-prevention-of-unfair-means-bill-2024' }],
            },
            {
                label: 'Browsers and tools',
                links: [
                    { label: 'Page Visibility API (MDN)', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API' },
                    { label: 'Fullscreen API on iPhone (Apple Developer Forums)', href: 'https://developer.apple.com/forums/thread/770080' },
                    { label: 'Locked mode for quizzes (Google Docs Editors Help)', href: 'https://support.google.com/docs/answer/7634943' },
                ],
            },
            {
                label: 'Exam patterns',
                links: [
                    { label: 'JEE Main (NTA)', href: 'https://jeemain.nta.nic.in/' },
                    { label: 'NEET-UG (NTA)', href: 'https://neet.nta.nic.in/' },
                    { label: 'Staff Selection Commission', href: 'https://ssc.gov.in/' },
                ],
            },
        ],
    },
};
