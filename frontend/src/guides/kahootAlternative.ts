/**
 * testoza.com/kahoot-alternative — where the line falls between a quiz game and a test,
 * why speed scoring is the wrong instinct for an Indian exam, and how to keep Kahoot for
 * the room while running the papers that count somewhere built for them.
 * Written for school teachers, coaching faculty and trainers.
 *
 * Kahoot facts (checked 10 October 2026, sources in `sources`):
 *   - "How points work" (support.kahoot.com/hc/articles/115002303908): a correct answer
 *     on a single-select question is worth up to 1000 points, multi-select up to 500 per
 *     correct answer; the host can set a question to no points or double points. Points
 *     fall with response time: 1 − (response time ÷ time limit) ÷ 2, times the points
 *     possible — Kahoot's own example is 967 of 1000 for a 2-second answer on a
 *     30-second timer. The speed reduction cannot be switched off in live games;
 *     Accuracy mode scores on correctness alone. Answer streaks add bonus points, and
 *     with points at 0 a streak still grows but earns no bonus.
 *   - Confidence experience: a separate game type with its own ±50/75/100 streak table.
 *   - Plans: live games are capped per plan. Kahoot's own pages and snapshots have shown
 *     free-tier caps around 10 players (40 on some teacher-plan pages) and paid tiers at
 *     50, 100, 200 and up to 400 participants per session; business 360 tiers start as
 *     low as 20. Tier names and prices change often, so this page describes the shape
 *     (a per-session player cap that rises with the plan) and tells the reader to check
 *     the live pricing page rather than quoting a figure as current.
 *   - Question types centre on multiple choice and true/false, with more formats
 *     (type answer, puzzle, poll, slider, multi-select and others) on higher plans.
 *
 * TestoZa claims: as verified for the Moodle guide, plus sectional timing (8 October
 * 2026). Not in the product, and never to be implied: live leaderboards with music,
 * a game podium, courses, essays, file uploads, a term gradebook.
 */
import { ALT_RIVALS, SCHEMES, mark, speedPoints } from './altData';
import { KAHOOT_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const R = ALT_RIVALS.kahoot;

const FIT_FALLBACK = `
<p>A checklist of what teachers open ${R.name} for. What ${R.name} is for: ${R.uses
    .filter((u) => u.kind === 'core')
    .map((u) => u.label.toLowerCase())
    .join('; ')}. What an exam platform is for: ${R.uses
    .filter((u) => u.kind === 'exam')
    .map((u) => u.label.toLowerCase())
    .join('; ')}. ${R.verdicts.keep.title}: ${R.verdicts.keep.text} ${R.verdicts.split.title} ${R.verdicts.split.text} ${R.verdicts.switch.title}: ${R.verdicts.switch.text}</p>`;

const COMPARE_FALLBACK = `
<div class="al-table-wrap al-table-wrap--wide"><table class="al-table al-table--vs">
<thead><tr><th scope="col">The question</th><th scope="col">${R.name}</th><th scope="col" class="al-us">TestoZa</th></tr></thead>
<tbody>
${R.themes
    .map(
        (t) => `<tr><th scope="row">${t.question}</th><td data-label="${R.name}">${t.them.join(' ')}</td><td data-label="TestoZa" class="al-us">${t.us.join(' ')}</td></tr>`,
    )
    .join('\n')}
</tbody>
</table></div>
<p>${R.themes.map((t) => t.takeaway).join(' ')}</p>`;

/** The crawler version of the speed lab: the same arithmetic, spelled out. */
const MARKING_FALLBACK = `
<p>One physics question — a 2 kg body moving at 3 m s⁻¹ brought to rest in 0.5 s, answer 12 N — scored two ways. Under Kahoot’s published formula, 1 − (response time ÷ time limit) ÷ 2 times the points possible, a correct answer on a 20-second timer is worth ${speedPoints(
    20,
    20,
    1000,
)} points answered instantly, about ${speedPoints(15, 20, 1000)} points after 5 seconds, ${speedPoints(
    10,
    20,
    1000,
)} points after 10 seconds and ${speedPoints(0, 20, 1000)} points if the clock nearly runs out — and a wrong answer scores nothing but costs nothing. In TestoZa the same answer is worth the marks typed on the question, whenever it arrives: ${SCHEMES.filter(
    (s) => s.wrong,
)
    .map((s) => `${s.full} +${mark(s.right)} with −${mark(s.wrong)} for a wrong tick`)
    .join(', ')}. Speed changes the game score by hundreds of points and changes the exam mark by nothing.</p>`;

const MOVE_FALLBACK = `
<ol class="al-list al-list--num">
${R.steps.map((s) => `<li><strong>${s.title} (${s.minutes} min)</strong>${s.detail}</li>`).join('\n')}
</ol>
<p>About ${R.steps.reduce((a, s) => a + s.minutes, 0)} minutes for a 30-question paper you already have. Friday’s Kahoot stays exactly as it is.</p>`;

export const KAHOOT_ALTERNATIVE: Guide = {
    meta: KAHOOT_META,
    body: {
        intro: [
            html(`
<p>Kahoot is excellent. Let us get that out of the way, because most “alternative” pages begin by pretending the thing they are replacing is bad, and anyone who has watched a tired Friday class come alive to a countdown and a leaderboard knows better.</p>
<p>The trouble starts when a tool that is brilliant at one job gets asked to do a second one. A teacher who runs a Kahoot every week eventually needs a test whose marks go on a record: a weekly test, a chapter test, a mock for students sitting JEE, NEET, CUET, SSC or a bank exam. And the thing that makes Kahoot wonderful in a classroom is exactly what makes it unfit for that paper.</p>
<p>It is not a matter of opinion, and it is not about features. It is in Kahoot’s own documentation. A correct answer is worth up to 1000 points on a single-select question — but the number falls with every second the player takes. Kahoot’s help centre gives the formula: one minus the response time divided by the time limit, halved, times the points possible. Answer correctly in 2 seconds on a 30-second timer and you score 967. Take 20 seconds and you score considerably less for the same correct answer. A wrong answer scores nothing, and costs nothing.</p>
<p>Now hold that next to the exam your students are actually sitting. JEE Main and NEET give +4 for a correct answer and take a mark off for a wrong one. SSC Tier 1 is +2 and −0.5. Bank prelims take off a quarter mark. In every one of those papers, a fast wrong answer is the single most expensive thing a candidate can do, and a slow right answer is worth exactly as much as a quick one.</p>
<p>So this guide is not “stop using Kahoot”. It is about where the line falls, what sits on the other side of it, and how to run both in the same week without confusing your students about what careful thinking is worth.</p>
`),
        ],

        answer:
            'Keep Kahoot for the room and use exam software for the papers that count. Kahoot scores on speed by design — up to 1000 points for a correct single-select answer, reduced by the time taken, with the reduction not switchable off in live games (Accuracy mode scores on correctness alone) — and its live games are capped by plan, with the free tier allowing only a handful of players. That is right for revision and wrong for a mock, because JEE, NEET, SSC and bank papers reward accuracy and punish fast guessing with negative marks. An exam platform gives you +4/−1 and partial marking per question, an exam-style screen with a question palette and Mark for review, sections with their own clock, a whole batch joining with one six-digit code, and a rank list with per-question analysis. TestoZa is one: free to build and run tests, ₹49 for 7 days, ₹149 for 30 days or ₹799 for a year. It has no leaderboards, music or podium — that is what Kahoot is for.',

        sections: [
            {
                id: 'what-you-use',
                title: 'Where the line falls',
                tocLabel: 'Where the line falls',
                kicker: 'Start here',
                blocks: [
                    html(`
<p>The useful question is not “which tool is better”. It is “what is this activity for”. Two jobs hide under the word “quiz”:</p>
<p><strong>A game is for attention.</strong> You want energy, noise, a reason for the quiet student at the back to lean forward, and you want it in the last ten minutes of a class. Nobody is being assessed; the score is a device for engagement. Accuracy matters less than participation, and speed is a feature because it creates tension.</p>
<p><strong>A test is for information.</strong> You want to know, accurately, what each student can do, and you want a number you can defend to that student, their parent and your own records. Here speed is noise — and worse, rewarding it teaches the opposite of what an exam rewards.</p>
<p>Switch on what you actually use Kahoot for, and notice how often the honest answer is “keep it”:</p>
`),
                    { type: 'widget', widget: 'alt-fit', fallbackHtml: FIT_FALLBACK },
                    html(`
<p>Three answers, and the middle one is the one most teachers should take:</p>
<ul class="al-list">
<li><strong>Keep Kahoot.</strong> If everything you ticked is energy, revision and icebreakers, you are using it exactly as intended. An exam platform would make those ten minutes worse. Close this page with a clear conscience.</li>
<li><strong>Keep Kahoot for the room; test somewhere else.</strong> The honest answer for most teachers. Two tools, two jobs, same students, no conflict.</li>
<li><strong>You are running exams on a game.</strong> If marks from a Kahoot are going into a record, into a parent conversation or into a decision about which batch a student belongs in, the scoring underneath those marks is not measuring what you think it is.</li>
</ul>
`),
                ],
            },
            {
                id: 'points',
                title: 'How Kahoot scores, and why an exam cannot',
                tocLabel: 'How points work',
                kicker: 'The crux',
                blocks: [
                    html(`
<p>This is the heart of the matter, so it is worth being precise rather than rhetorical. From Kahoot’s own help centre:</p>
<ul class="al-checks">
<li><strong>Up to 1000 points</strong> for a correct answer on a single-select question; up to 500 points per correct answer on multi-select. A host can set a question to no points or double points.</li>
<li><strong>Points fall with time taken.</strong> The formula is 1 − (response time ÷ time limit) ÷ 2, times the points possible. Kahoot’s worked example: a correct answer in 2 seconds on a 30-second timer scores 967 of 1000.</li>
<li><strong>The speed reduction cannot be switched off</strong> in live games. Accuracy mode, which awards points on correctness alone, is the way around it.</li>
<li><strong>Answer streaks add bonus points</strong> on top, and a streak keeps building even when points are set to zero.</li>
</ul>
<p>Read that list as a design document and it is admirable: every rule exists to make a room tense and loud. Read it as a marking scheme and the problems are structural. Two students who both understand the topic can finish hundreds of points apart. A student who reads the question twice — the behaviour you spend the year teaching — is penalised. And a wrong answer is free, so the correct strategy is to tap something immediately rather than think.</p>
<p>Try it. Answer the question below quickly, then press Again, wait, and answer it correctly late. Then answer it wrong deliberately and compare the two columns:</p>
`),
                    { type: 'widget', widget: 'alt-marking', fallbackHtml: MARKING_FALLBACK },
                    html(`
<p>The right-hand column is the arithmetic of the exam your students are sitting. Under +4/−1, four wrong guesses cancel a correct answer, which is why serious candidates learn to leave questions blank — a skill with a real name in coaching circles (attempt strategy) and real marks attached to it. A game that pays nothing for a wrong answer cannot teach it. In fact it teaches the reverse, twice a week, all year.</p>
<p>In TestoZa the scheme is two fields on the question card, <strong>Marks</strong> and <strong>Wrong</strong>, and a new question copies the previous one’s. Time is still measured — you see how long each student spent on each question in the analysis — but it never touches the marks. That split is the whole difference: measure speed, do not pay for it.</p>
`),
                ],
            },
            {
                id: 'side-by-side',
                title: 'Kahoot and an exam platform, question by question',
                tocLabel: 'Side by side',
                kicker: 'Side by side',
                blocks: [
                    html(`
<p>Four questions a teacher actually asks, with both answers and what each one costs in practice:</p>
`),
                    { type: 'widget', widget: 'alt-compare', fallbackHtml: COMPARE_FALLBACK },
                    html(`
<p>One of those deserves a flag before you plan a mock: the player cap. Kahoot’s live games are limited per plan, the free tier allows only a handful of players at once, and the tiers and numbers change from time to time. Check the cap on the plan you are actually on before you promise a batch of 120 students a test on Sunday.</p>
`),
                ],
            },
            {
                id: 'the-screen',
                title: 'What an exam screen has that a game screen does not',
                tocLabel: 'The exam screen',
                kicker: 'Practising the real thing',
                blocks: [
                    html(`
<p>A mock is practice for a specific screen as much as for a syllabus. Students who have only ever answered questions as coloured tiles on a projector meet the real interface for the first time on the day it counts, and spend the first ten minutes learning where things are.</p>
<p>An exam screen — the sort NTA and the banking exams use, and the sort TestoZa reproduces — has furniture a game has no reason to carry:</p>
<ul class="al-checks">
<li><strong>A question palette.</strong> Every question in the paper, colour-coded: answered, not answered, not visited, marked for review. Candidates navigate by it, and reading it is a skill.</li>
<li><strong>Mark for review.</strong> The formal version of “come back to this”, which is how a 180-question paper is actually survived.</li>
<li><strong>One clock for the whole paper,</strong> not a countdown per question — so the student, not the software, decides where the minutes go. Where the real exam times each section separately, as SSC Tier 1 and bank prelims now do, sections can close on their own and stay closed.</li>
<li><strong>Question types that match the paper.</strong> Numerical answers typed on a keypad and accepted within a range, multiple-correct questions with partial marks, comprehension passages, two-decimal answers.</li>
<li><strong>Exam rules.</strong> Forced full screen, tab switches counted against a limit that can submit the paper, copy and right-click off, back button blocked. Not a guarantee against cheating — nothing in a browser is — but the deterrent the real centre provides.</li>
<li><strong>Nobody watching.</strong> A test is sat alone, on the candidate’s own phone, in silence. That is part of what is being practised.</li>
</ul>
<p>None of this would improve a Friday revision game. All of it changes what a mock measures.</p>
`),
                ],
            },
            {
                id: 'batch',
                title: 'A whole batch, one code, and what it costs',
                tocLabel: 'A whole batch',
                kicker: 'Running it',
                blocks: [
                    html(`
<p>The mechanics of getting forty or four hundred people into the same paper at the same time are where classroom tools and exam software diverge a second time.</p>
<p>In TestoZa, you give a paper to a batch as a live exam and get a six-digit code, a QR code and a projector view. Candidates open <a href="/join">testoza.com/join</a>, type the code and check in by name or roll number, optionally with a four-digit PIN. There is no account to create, no app to install, and no per-session player tier to buy.</p>
<ol class="al-list al-list--num">
<li><strong>The lobby</strong> shows who has arrived, so you know who is missing before you start rather than after.</li>
<li><strong>Start</strong> when the room is ready, or set a time and let it start itself; latecomers can still be admitted.</li>
<li><strong>The live list</strong> gives you minutes left, questions answered and flags per candidate — no signal, changed device, left the exam screen.</li>
<li><strong>Extra time</strong> for one candidate (+5, +10) or for everyone still writing (5 to 30 minutes), which is what you want the day the building’s Wi-Fi stutters.</li>
<li><strong>Nothing is lost.</strong> Answers save to the server every 20 seconds and a candidate can rejoin on another device and carry on. Papers submit themselves when the time is up.</li>
</ol>
<p>On price, the comparison is worth doing in your own numbers rather than ours. Kahoot’s paid personal and teacher plans are priced per teacher with a player cap per session, in dollars. An exam sitting in TestoZa has no cap and no per-candidate charge: building and running tests is free, and the paid plans — ₹49 for 7 days, ₹149 for 30 days, ₹799 for a year — buy the exam rules and extras. For a single teacher running revision games, Kahoot’s plan is reasonable value. For an institute putting 300 students through a mock, a per-session player cap is the wrong shape of meter entirely.</p>
`),
                ],
            },
            {
                id: 'after',
                title: 'What you have the next morning',
                tocLabel: 'After the test',
                kicker: 'Results',
                blocks: [
                    html(`
<p>A game ends in a podium. A test ends in three documents, and they go to three different people.</p>
<h3>The teacher’s copy</h3>
<p>A rank list that fills in as papers come in, with the class average, highest and lowest, and section averages where the paper has sections. Then the per-question numbers: attempted, correct, average time spent, and which wrong option the batch chose. That last column is the one worth the subscription — when half a class picks the same wrong option, you have found a misconception, not bad luck.</p>
<h3>The parent’s copy</h3>
<p>Report cards that print or save as PDF, and, if the batch list holds a parent’s number, a WhatsApp message prepared with the marks in it for you to send. Nothing goes out automatically.</p>
<h3>The student’s copy</h3>
<p>Their own paper back, with the key, released when the exam ends, as each paper is submitted, or by hand once you have looked. Candidates from a live sitting can look their result up later with the code. Everything exports to Excel, because batch decisions get made in spreadsheets.</p>
<p>Game reports are genuinely useful for a teacher reading a room — which questions the class fumbled, who is disengaged. They are not a mark sheet, and they are not meant to be.</p>
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
<p>The best arrangement is not a migration. It is a division of labour, and it is simple enough to put on a timetable:</p>
<ul class="al-list">
<li><strong>Monday to Thursday — Kahoot, 8 minutes, end of class.</strong> Three to five questions on what was taught that day. Points, speed, music, all of it. The purpose is attention and recall, and speed scoring is a feature here because nobody is being measured.</li>
<li><strong>Friday — a short paper that counts, 20 minutes, exam screen.</strong> Ten questions on the week, with your exam’s marking: +4/−1 if you are preparing entrance candidates, +1/0 for a school unit test. Same students, different contract. Say out loud that this one is marked like the real exam, so a guess costs them.</li>
<li><strong>Sunday, monthly — a full mock.</strong> Full length, full duration, sections if the real paper has them, exam rules on, phones on mobile data. This is the dress rehearsal, and the rank list goes on the board.</li>
<li><strong>After each mock — one Kahoot built from the five questions the batch got worst.</strong> This is the trick worth stealing: the per-question analysis tells you exactly which five, and the game is the cheapest way to make the correction stick.</li>
</ul>
<p>Students pick up the distinction faster than teachers expect, provided the distinction is stated. The game is for learning, loudly, with no consequences. The paper is for measuring, quietly, with marks that count. Mixing the two — a game whose scores go on a record — is the only version that teaches the wrong lesson.</p>
`),
                ],
            },
            {
                id: 'move-one-paper',
                title: 'Moving the paper that counts, in about 20 minutes',
                tocLabel: 'Moving a paper',
                kicker: 'Try it small',
                blocks: [
                    html(`
<p>Nothing leaves Kahoot. Take the one test whose marks matter and set it up properly:</p>
`),
                    { type: 'widget', widget: 'alt-move', fallbackHtml: MOVE_FALLBACK },
                    html(`
<p>Afterwards, look at one number before anything else: the marks of the students who guessed. If the paper was marked the way your exam marks, the rank list will have rearranged itself compared with your games — and that rearrangement is the information you were missing.</p>
`),
                ],
            },
            {
                id: 'where-kahoot-wins',
                title: 'Where Kahoot wins, and we are not close',
                tocLabel: 'Where Kahoot wins',
                kicker: 'Being straight',
                blocks: [
                    html(`
<p>An honest comparison has a column where the other side wins. Here is Kahoot’s, and it is not a short one:</p>
<ul class="al-limits">
<li><strong>A room coming alive.</strong> The lobby music, the countdown, the leaderboard between questions, the gasp when someone overtakes. Kahoot has spent a decade on that and it works. TestoZa has none of it — no live leaderboard, no music, no podium — and deliberately so: an exam screen that cheers would be a bad exam screen.</li>
<li><strong>Icebreakers and training sessions.</strong> For a staff meeting, a workshop or the first day of a batch, a game is the right tool and a test is a strange one.</li>
<li><strong>Zero setup for five questions.</strong> Typing three questions and launching a game takes two minutes. An exam platform asks you to think about marks, duration and sections, which is overhead you do not want for a warm-up.</li>
<li><strong>A library of ready games.</strong> Millions of public kahoots exist on nearly every school topic. TestoZa has a public test library, but nothing on that scale.</li>
<li><strong>Younger classes.</strong> For a class of eight-year-olds, the game format is doing real pedagogical work. A question palette and negative marking would be absurd.</li>
<li><strong>Polls, word clouds and brainstorms.</strong> Kahoot’s non-quiz formats are genuinely useful in a classroom and have no equivalent here.</li>
</ul>
<p>And here is what TestoZa cannot do, stated plainly so nobody is surprised: no courses or lessons, no essays or file uploads, no term gradebook, no attendance, no fees, and no game modes. It builds papers, runs exams, marks them and reports on them.</p>
<p>Which is why the recommendation at the end of this page is not “switch”. It is: keep the game for the room, and stop asking it to be a mark sheet.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'What is the best Kahoot alternative for real tests?',
                a: 'If you want the game experience with a different brand, look at tools in the same category — Wayground (the new name for Quizizz), Blooket, Gimkit, Baamboozle, Mentimeter. If what you actually need is a test whose marks count, you want exam software rather than another game: exam-pattern marking such as +4/−1, an exam-style screen with a question palette, sections with their own clock, and a rank list with per-question analysis. TestoZa is one, and building and running tests on it is free.',
            },
            {
                q: 'Can I turn off speed scoring in Kahoot?',
                a: 'Not in a live game. Kahoot’s help centre says the speed-of-answer point reduction cannot be disabled for live games; the alternative is Accuracy mode, which awards points on correctness alone. A host can also set a question to no points or double points. For a paper where marks go on a record, the simpler answer is to use software whose marks never depend on time.',
            },
            {
                q: 'How many players can join a Kahoot game?',
                a: 'It depends on your plan, and the numbers change. Kahoot’s free tier has commonly been limited to around 10 players in a live game, with paid personal, teacher and business tiers raising the cap in steps — 50, 100, 200 and higher. Check the cap on the plan you hold before planning a test for a large batch. A live exam in TestoZa has no per-session player tier.',
            },
            {
                q: 'Does Kahoot support negative marking?',
                a: 'No. Kahoot awards points for correct answers, scaled by speed, with streak bonuses; a wrong answer scores zero but costs nothing. That is the right design for a game and the wrong one for a mock of an exam that deducts marks for wrong answers, such as JEE Main, NEET, SSC or bank papers.',
            },
            {
                q: 'Is TestoZa free, and what do the paid plans add?',
                a: 'Building tests, running live exams, marking, rank lists and report cards are free. Paid plans — ₹49 for 7 days, ₹149 for 30 days, ₹799 for a year — add the exam rules such as forced full screen and tab-switch limits, along with other extras. There is no per-candidate charge and no cap on how many sit a paper.',
            },
            {
                q: 'Do students need accounts to take a test?',
                a: 'Not for a live exam. They open testoza.com/join in any browser, type the six-digit code and check in by name or roll number, optionally with a four-digit PIN. Answers save to the server every 20 seconds, so a dead phone is not a lost paper — they rejoin on another device and carry on. An account is only needed for a student practising alone.',
            },
            {
                q: 'Can I still use Kahoot for revision if I move my tests?',
                a: 'Yes, and you should. The arrangement most teachers settle on is a short Kahoot at the end of a class for recall and energy, and a properly marked paper on the exam screen for the tests that count. A good trick: after each mock, build a Kahoot from the five questions the per-question analysis says the batch got worst.',
            },
            {
                q: 'Can I reuse my Kahoot questions?',
                a: 'Not through an import — there is no connector between the two. What works in practice is to export or print your kahoot as a PDF and upload that to the AI test generator, which reads questions, options and the key. Then set the marks and duration, because a game carries neither.',
            },
            {
                q: 'Which is better for a coaching institute?',
                a: 'For the teaching, both have a place. For the test series, exam software, without much argument: a coaching institute needs negative marking, sections with their own clock, batch rank lists, report cards and per-question analysis, and a game built around speed-scored points cannot produce any of them. Keep Kahoot for the classroom hour.',
            },
        ],

        closingTitle: 'Keep the game. Fix the paper.',
        closing: [
            html(`
<p>Pick the test whose marks actually count, and give it twenty minutes:</p>
<div class="al-paths">
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Paper already written?</span><span class="al-path-what">Upload the PDF and let the AI read it</span></a>
<a class="al-path" href="/create-test" data-icon="pencil"><span class="al-path-who">Starting from scratch?</span><span class="al-path-what">Build it with +4/−1 and a real clock</span></a>
<a class="al-path" href="/user-guide/live-exam-sessions" data-icon="key"><span class="al-path-who">Running it for a batch?</span><span class="al-path-what">See how join codes and the exam room work</span></a>
</div>
<p>Related reading: <a href="/best-online-test-platform">choosing an online test platform</a>, <a href="/cbt-exam-software">CBT exam software</a>, <a href="/prevent-cheating-in-online-exams">preventing cheating in online exams</a>, <a href="/ai-test-generator">the AI test generator</a> and <a href="/pricing">pricing</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Kahoot',
                links: [
                    { label: 'How points work', href: 'https://support.kahoot.com/hc/articles/115002303908' },
                    { label: 'Kahoot help centre', href: 'https://support.kahoot.com/hc/en-us' },
                    { label: 'Plans and pricing', href: 'https://kahoot.com/schools/plans/' },
                    { label: 'Kahoot for schools', href: 'https://kahoot.com/schools/' },
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
