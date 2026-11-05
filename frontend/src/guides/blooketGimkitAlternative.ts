/**
 * testoza.com/blooket-gimkit-alternative — other classroom games for Blooket and Gimkit
 * users, and the moment to switch from a game to a marked test. Written for school
 * teachers and tuition teachers who already play Blooket or Gimkit in class.
 *
 * Not the same page as /kahoot-alternative (Kahoot scores speed); this one is about luck
 * and in-game economies (chests, cash, upgrades) deciding the winner.
 *
 * Facts and where they come from (sources in `sources`), checked 5 November 2026:
 *   - Blooket: Gold Quest, from Blooket's help centre ("Game Overview: Gold Quest"): each
 *     correct answer lets a player pick one of three chests; the most gold at the end wins;
 *     a "Take" reward takes 10% or 25% of another player's gold; a dragon in a chest takes
 *     your gold. The free plan hosts games of up to 60 players; Plus raises that to 300 in
 *     most modes (some modes stay at 60). Blooket shows prices only after sign-in; reviews
 *     from autumn 2026 (AhaSlides, Nibble) report Plus at about $4.99 a month billed yearly
 *     ($59.88) and Plus Flex at about $9.99 billed monthly. Those are labelled third-party.
 *   - Gimkit: help centre, "Gimkit Pro FAQ": Basic (free) lets you "play Gimkit featured
 *     modes with as many students as you want, set up classes (rostering), and collect
 *     reports"; generally three modes are free at a time, rotating; Pro gives every mode
 *     ("Pro Exclusives"), Assignments, images and audio in questions; Pro annual $59.88,
 *     Pro monthly $14.99; Groups: Department $650 a year for up to 20 teachers, School
 *     $1,000 a year. Classic mode: earn in-game money per correct answer, spend it on
 *     upgrades (money per question, streak bonus, multiplier, insurance); a wrong answer
 *     breaks a streak and can cost money, which Insurance reduces (Gimkit's blog on
 *     streaks, community guides). No penalty formula is quoted, because Gimkit publishes none.
 *   - Kahoot, Wayground, Socrative, Google Forms: as in bestOnlineExamSoftwareIndia.ts.
 *
 * TestoZa claims: Marks and Wrong per question, exam screen with palette and Mark for
 * review, timer, join code at testoza.com/join with no app or account, AI import from PDFs
 * and photos, rank list, topic and section results, time per question, report cards, parent
 * WhatsApp notes, ₹49 / ₹149 / ₹799. Not in the product, never to be implied: game modes,
 * avatars, power-ups, a live game podium, student-written question sets.
 */
import { COMPARISON_PAGES } from './comparisonData';
import { compareFallback, scenariosFallback, stepsFallback } from './howtoFallback';
import { BLOOKET_GIMKIT_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const P = COMPARISON_PAGES.blooketGimkit;

export const BLOOKET_GIMKIT_ALTERNATIVE: Guide = {
    meta: BLOOKET_GIMKIT_META,
    body: {
        intro: [
            html(`
<p>If your students cheer when you open Blooket, or beg for one more round of Gimkit, you already know what these two do well. They turn revision into a game that a whole class plays at once, and students who would never open a worksheet will answer forty questions to win one.</p>
<p>So why look for an alternative? Usually for one of three reasons. The free plan has started to pinch: Blooket caps a free game at 60 players, and Gimkit’s free plan only offers a few game modes at a time. The class has grown tired of the same game. Or, most often, you have noticed that the student who won today’s game is not the student who knows the chapter best, and you need a score you can actually put in the register.</p>
<p>This guide covers all three. It lists other classroom games worth trying if you want a change, compares Blooket and Gimkit if you are choosing between them, and explains when a game should give way to a marked test. We make <a href="/">TestoZa</a>, which is a test platform, not a game, so we also say plainly where Blooket and Gimkit are the better tool.</p>
`),
        ],

        answer:
            'The best Blooket or Gimkit alternative depends on what you need. For another classroom game, try Kahoot or Wayground (formerly Quizizz), or switch between Blooket and Gimkit. For a quick check at the end of a lesson, Socrative or Google Forms. When the score has to count, as in a weekly test, an exam mock or marks for the register, use a marked test instead of a game: in Blooket and Gimkit the winner depends partly on random chests, in-game cash and upgrades. TestoZa makes timed tests with negative marking, an exam-style screen and a rank list, free to build and run, and students join with a code, no app or account.',

        sections: [
            {
                id: 'why',
                title: 'Why teachers look for a Blooket or Gimkit alternative',
                tocLabel: 'Why switch',
                kicker: 'The reasons',
                blocks: [
                    html(`
<p>Most teachers who search for an alternative are not unhappy with the game. They have hit one of these limits:</p>
<ol class="al-list al-list--num">
<li><strong>The free plan.</strong>Blooket’s free plan hosts games of up to 60 players; its paid plan, Plus, raises that to 300 in most modes. Gimkit’s free plan, Basic, lets any number of students play, but only in its “featured” modes, generally three at a time on rotation. Every other mode, assignments and pictures in questions need Gimkit Pro.</li>
<li><strong>The price is in dollars.</strong>Gimkit Pro is $59.88 a year or $14.99 a month, from its own help centre. Blooket shows its prices only after you sign in; reviews from autumn 2026 report Plus at about $4.99 a month billed yearly. For a teacher in India paying from their own pocket, a dollar subscription for one classroom tool is a real decision.</li>
<li><strong>The game has gone stale.</strong>Students learn the game as well as the content. When the class has worked out the best chest strategy or the best upgrade order, a new game resets the fun.</li>
<li><strong>The winner isn’t the student who knows the most.</strong>This is the big one, and the next section explains why it happens by design.</li>
</ol>
<p>The first three are reasons to try another game. The fourth is a reason to add a different kind of tool alongside the game, not instead of it.</p>
`),
                ],
            },
            {
                id: 'luck',
                title: 'Why the winner of a game isn’t the best student',
                tocLabel: 'Luck and strategy',
                kicker: 'How they score',
                blocks: [
                    html(`
<p>Blooket and Gimkit are deliberately built so that anyone can win. That is good game design. It keeps the weakest students playing, because they can still come first. It also means the leaderboard measures something other than knowledge.</p>
<h3>Blooket: the chest decides</h3>
<p>Take Gold Quest, one of Blooket’s best-known modes. According to Blooket’s own help centre, every correct answer lets a player open one of three chests. A chest might hold some gold, a reward that multiplies it, a “Take” that grabs 10% or 25% of another player’s gold, or a dragon that takes yours. The player with the most gold at the end wins. A student who answers twenty questions correctly can lose to one who answers twelve and opens luckier chests. Blooket designed it this way so that a player who is behind can catch up quickly.</p>
<h3>Gimkit: the economy decides</h3>
<p>Gimkit’s Classic mode is closer to a business game. Each correct answer earns in-game money, and students spend it in a shop on upgrades: more money per question, a streak bonus, a multiplier, and insurance. A wrong answer breaks your streak and can cost money, and insurance softens that loss. So the winner is partly the student who answered well and partly the student who spent well. That is a real skill, and students love it, but it isn’t the chapter you taught.</p>
<h3>What a marked test does instead</h3>
<p>In a test, the same answers always give the same score. There is no chest, no shop and no theft. A wrong answer costs exactly what the real exam would take, and a blank costs nothing. That is less exciting, and it is the only kind of score that tells you who needs help.</p>
`),
                    { type: 'widget', widget: 'hw-compare', fallbackHtml: compareFallback(P) },
                ],
            },
            {
                id: 'which-one',
                title: 'Game or test? Six classroom moments',
                tocLabel: 'Game or test',
                kicker: 'Your situation',
                blocks: [
                    html(`
<p>Most teachers who use both tools split them by moment, not by class. Pick the moment closest to yours:</p>
`),
                    { type: 'widget', widget: 'hw-scenarios', fallbackHtml: scenariosFallback(P) },
                ],
            },
            {
                id: 'games',
                title: 'Other classroom games worth trying',
                tocLabel: 'Other games',
                kicker: 'If you want a game',
                blocks: [
                    html(`
<p>If what you need is a fresh game, these are the well-known options. All of them are good; they differ in how they score and what the free plan allows.</p>
<div class="al-table-wrap al-table-wrap--wide"><table class="al-table">
<thead><tr><th scope="col">Tool</th><th scope="col">What decides the winner</th><th scope="col">Free plan</th><th scope="col">Best for</th></tr></thead>
<tbody>
<tr><th scope="row">Blooket</th><td data-label="What decides the winner">Correct answers plus random rewards (chests in Gold Quest)</td><td data-label="Free plan">Games of up to 60 players</td><td data-label="Best for">Younger classes; lots of different game modes</td></tr>
<tr><th scope="row">Gimkit</th><td data-label="What decides the winner">Correct answers plus how students spend in-game money</td><td data-label="Free plan">Any number of players, a few featured modes at a time</td><td data-label="Best for">Older students who enjoy strategy</td></tr>
<tr><th scope="row">Kahoot</th><td data-label="What decides the winner">Correct answers plus speed: up to 1,000 points, falling with time taken</td><td data-label="Free plan">Free tier with a cap on players per game</td><td data-label="Best for">A fast, loud quiz on one screen at the front of the room</td></tr>
<tr><th scope="row">Wayground (formerly Quizizz)</th><td data-label="What decides the winner">Correct answers, with power-ups and streaks if you switch them on</td><td data-label="Free plan">A free Basic plan for teachers</td><td data-label="Best for">Students playing at their own pace on their own devices</td></tr>
<tr><th scope="row">Socrative</th><td data-label="What decides the winner">No winner by default: a percentage per student</td><td data-label="Free plan">One room of up to 50 students</td><td data-label="Best for">Exit tickets and quick checks, with an optional Space Race</td></tr>
<tr><th scope="row">Google Forms</th><td data-label="What decides the winner">No game; a score per student</td><td data-label="Free plan">Free</td><td data-label="Best for">A quiet recap that you mark later</td></tr>
</tbody>
</table></div>
<p class="al-note">Free plans change often. Figures are from each company’s own pages in October and November 2026.</p>
<h3>Kahoot: the original, built on speed</h3>
<p>Kahoot runs the question on one shared screen and students answer on their devices. Its own help pages publish the scoring: a correct answer earns up to 1,000 points, and the points fall the longer a student takes. In live games the speed element can’t be switched off. That makes it the loudest, most exciting option, and the one that most rewards fast guessing. Our <a href="/kahoot-alternative">Kahoot alternative guide</a> covers it in detail.</p>
<h3>Wayground: self-paced games</h3>
<p>Wayground is the new name for Quizizz. Students play on their own devices at their own pace, with the question on their screen rather than at the front, which suits mixed-ability classes better than a race. It also has an AI generator that builds a quiz from a document or a video; see our <a href="/best-ai-quiz-generator">AI quiz generator comparison</a>.</p>
<h3>Socrative: a check, not a game</h3>
<p>Socrative is for finding out who understood, quickly. It has three question types and gives each student a percentage. The free plan is one room of up to 50 students. Its Space Race adds a team game if you want one. More in our <a href="/socrative-alternative">Socrative guide</a>.</p>
<h3>Switching between Blooket and Gimkit</h3>
<p>The simplest alternative to one of these is the other. Classes that are bored of Blooket’s chests often love Gimkit’s shop, and the other way round. If you are choosing between them for the long term, the next section compares them side by side.</p>
`),
                ],
            },
            {
                id: 'vs',
                title: 'Blooket vs Gimkit, if you are choosing between them',
                tocLabel: 'Blooket vs Gimkit',
                kicker: 'Side by side',
                blocks: [
                    html(`
<div class="al-table-wrap al-table-wrap--wide"><table class="al-table">
<thead><tr><th scope="col"></th><th scope="col">Blooket</th><th scope="col">Gimkit</th></tr></thead>
<tbody>
<tr><th scope="row">Free plan</th><td data-label="Blooket">Every essential feature; games of up to 60 players</td><td data-label="Gimkit">Featured modes only (about three at a time, rotating), any number of players, classes and reports</td></tr>
<tr><th scope="row">Paid plan</th><td data-label="Blooket">Plus: up to 300 players in most modes, more modes and reports. Price shown after sign-in (reviews report about $4.99 a month, billed yearly)</td><td data-label="Gimkit">Pro: every mode, assignments, pictures and audio in questions. $59.88 a year or $14.99 a month</td></tr>
<tr><th scope="row">For a whole school</th><td data-label="Blooket">Group plans, priced by size</td><td data-label="Gimkit">$650 a year for up to 20 teachers; $1,000 a year for a school</td></tr>
<tr><th scope="row">The winner</th><td data-label="Blooket">Correct answers plus luck from random rewards</td><td data-label="Gimkit">Correct answers plus how well students spend</td></tr>
<tr><th scope="row">Feels like</th><td data-label="Blooket">A collection of mini games with cute characters</td><td data-label="Gimkit">A strategy game with a shop</td></tr>
<tr><th scope="row">Suits</th><td data-label="Blooket">Primary and middle school</td><td data-label="Gimkit">Middle and high school</td></tr>
</tbody>
</table></div>
<p>Both are excellent at what they are for. Neither is built to mark a test, and neither claims to be.</p>
`),
                ],
            },
            {
                id: 'marked-test',
                title: 'When the score has to count: a marked test',
                tocLabel: 'A marked test',
                kicker: 'The other tool',
                blocks: [
                    html(`
<p>Some scores have to mean something: a weekly chapter test that goes in the register, a monthly test whose result goes home to parents, or a mock for JEE, NEET, SSC, bank exams or CUET where students need to practise under the real rules. For those, a game gets in the way. You need a test.</p>
<p>TestoZa is an online test platform built for that job. Here is what a game leaves out and a test puts back:</p>
<ul class="al-list">
<li><strong>Fixed marks.</strong>Every question has a Marks and a Wrong box. +1 with no negative for a school test, +4/−1 for JEE Main and NEET, −0.25 for bank exams. The same answers always get the same score.</li>
<li><strong>A real exam screen.</strong>A countdown, a question palette with Mark for review, Back and Save & Next: the layout of NTA’s computer-based tests, so the real exam doesn’t feel new.</li>
<li><strong>No app and no account for students.</strong>They type a six-digit code at <a href="/join">testoza.com/join</a> and their name or roll number. Answers save every 20 seconds, so a dropped signal doesn’t lose them.</li>
<li><strong>Questions in minutes.</strong>Upload a PDF or photograph a textbook page and the AI reads the questions, options and answers into the builder for you to check. You can reuse the same questions you put in your game.</li>
<li><strong>Results you can act on.</strong>A rank list by marks, results by section and topic, time per question, printable report cards and a ready-written WhatsApp note for each parent that you send with one tap.</li>
</ul>
<p>Building tests, running them and seeing results are free. Paid plans add exam rules such as forced full screen and tab-switch limits: ₹49 for 7 days, ₹149 for 30 days, ₹799 a year, with no per-student charge. See <a href="/pricing">pricing</a>.</p>
<p>The habit that works for many teachers: test on Wednesday, then build Friday’s Blooket or Gimkit round from the questions most students got wrong. The test finds the gaps; the game fixes them while everyone is enjoying it.</p>
`),
                ],
            },
            {
                id: 'move',
                title: 'How to move one game set into a marked test',
                tocLabel: 'Move a set',
                kicker: 'Step by step',
                blocks: [
                    html(`
<p>You don’t need to rebuild anything. Take the set your class played this week, or the textbook page it came from, and do this:</p>
${stepsFallback(P)}
<h3>When TestoZa is the wrong pick</h3>
<p>We would rather you used the right tool than ours. TestoZa is not a replacement for Blooket or Gimkit if what you want is:</p>
<ul class="al-limits">
<li><strong>A game.</strong> There are no game modes, characters, chests, shops or power-ups, and no podium at the end of a live round.</li>
<li><strong>Noise and energy in the room.</strong> A test is quiet on purpose. For a Friday revision game, keep Blooket, Gimkit, Kahoot or Wayground.</li>
<li><strong>Students writing the questions.</strong> Gimkit’s KitCollab lets the class submit questions for the game; TestoZa’s questions are written by the teacher.</li>
<li><strong>Very young children.</strong> The exam screen is built for older students and exam practice, roughly Class 6 upwards.</li>
</ul>
<p>And if the score needs to count, a test is the job TestoZa was built for. See <a href="/online-test-for-tuition-teachers">weekly tests for tuition teachers</a> or <a href="/cbse-online-test-maker">CBSE chapter tests</a>.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'What is the best alternative to Blooket?',
                a: 'For another game, Gimkit, Kahoot or Wayground (formerly Quizizz). For a quick lesson check, Socrative or Google Forms. When the score has to count, such as a weekly test or exam mock, use a marked test like TestoZa, where marks depend only on the answers, not on random chests.',
            },
            {
                q: 'What is the best alternative to Gimkit?',
                a: 'Blooket if you want a different game, Kahoot for a fast whole-class quiz, Wayground for self-paced games. For tests whose marks go in the register, a test platform such as TestoZa, with fixed marks, negative marking, a timer and a rank list.',
            },
            {
                q: 'Is Blooket free?',
                a: 'Yes. Blooket’s free plan includes its essential features and hosts games of up to 60 players. Blooket Plus raises the cap to 300 in most modes and adds more modes and reports. Blooket shows its prices after you sign in.',
            },
            {
                q: 'How much does Gimkit Pro cost?',
                a: 'From Gimkit’s help centre: $59.88 a year or $14.99 a month. Gimkit Basic is free but offers only its featured game modes, about three at a time. Gimkit also sells group plans: $650 a year for up to 20 teachers and $1,000 a year for a whole school.',
            },
            {
                q: 'Blooket or Gimkit: which is better?',
                a: 'Blooket suits younger classes and has many mini games built on random rewards. Gimkit suits older students who enjoy strategy: they earn in-game money and spend it on upgrades. Blooket’s free plan caps games at 60 players; Gimkit’s free plan limits the modes. Both are games, not marked tests.',
            },
            {
                q: 'Can I use Blooket or Gimkit for a graded test?',
                a: 'You can, but the game’s winner depends partly on luck (Blooket’s chests) or strategy (Gimkit’s upgrades), not only on correct answers. For a grade, use the per-question report, not the leaderboard, or run a marked test where the same answers always earn the same score.',
            },
            {
                q: 'Is there a free alternative to Blooket and Gimkit for tests?',
                a: 'Yes. TestoZa is free to build tests, run them and see results, with no limit on students. Students join with a six-digit code and need no app or account. Paid plans, from ₹49 for 7 days, add exam rules such as forced full screen.',
            },
            {
                q: 'Do Blooket and Gimkit have negative marking?',
                a: 'Not as marks. In Gimkit a wrong answer can cost in-game money and breaks a streak, and an upgrade called Insurance reduces that loss. Neither takes off exam marks the way JEE, NEET or bank exams do. TestoZa lets you set any negative mark on each question.',
            },
        ],

        closingTitle: 'Keep the game. Add a test that counts.',
        closing: [
            html(`
<p>Take the set your class played this week and turn it into a test they sit before the next game:</p>
<div class="al-paths">
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Have the page or PDF?</span><span class="al-path-what">Let the AI read it into a test</span></a>
<a class="al-path" href="/create-test" data-icon="pencil"><span class="al-path-who">Starting from scratch?</span><span class="al-path-what">Build it with your own marking</span></a>
<a class="al-path" href="/user-guide/live-exam-sessions" data-icon="key"><span class="al-path-who">Whole class at once?</span><span class="al-path-what">See how join codes work</span></a>
</div>
<p>Related reading: <a href="/kahoot-alternative">Kahoot alternative</a>, <a href="/socrative-alternative">Socrative alternative</a>, <a href="/online-test-with-negative-marking">tests with negative marking</a>, <a href="/best-ai-quiz-generator">best AI quiz generators</a> and <a href="/guides">all guides</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Blooket',
                links: [
                    { label: 'Game Overview: Gold Quest', href: 'https://help.blooket.com/hc/en-us/articles/42100784373655-Game-Overview-Gold-Quest' },
                    { label: 'Blooket review and pricing (AhaSlides, third-party)', href: 'https://ahaslides.com/blog/blooket-review/' },
                ],
            },
            {
                label: 'Gimkit',
                links: [
                    { label: 'Gimkit Pro FAQ', href: 'https://help.gimkit.com/en/article/gimkit-pro-faq-14h6d62/' },
                    { label: 'Gimkit blog', href: 'https://blog.gimkit.com/' },
                ],
            },
            {
                label: 'Kahoot, Wayground and Socrative',
                links: [
                    { label: 'How points work (Kahoot)', href: 'https://support.kahoot.com/hc/articles/115002303908' },
                    {
                        label: 'Quizizz is now Wayground',
                        href: 'https://help.wayground.com/support/solutions/articles/158000403867-quizizz-is-now-wayground-what-s-changing-and-what-s-not',
                    },
                    { label: 'Socrative plans', href: 'https://www.socrative.com/plans/' },
                ],
            },
            {
                label: 'TestoZa',
                links: [
                    { label: 'Pricing', href: 'https://testoza.com/pricing' },
                    { label: 'Join an exam', href: 'https://testoza.com/join' },
                ],
            },
        ],
    },
};
