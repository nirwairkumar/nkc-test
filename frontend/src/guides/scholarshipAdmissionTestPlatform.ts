/**
 * testoza.com/scholarship-admission-test-platform — running a coaching institute's
 * admission-cum-scholarship test online, in the centre, or at partner schools: registration
 * details, fairness settings, results day, scholarship slabs and follow-up.
 *
 * Facts and where they come from:
 *   - Aakash ANTHE 2026 (aakash.ac.in, checked 30 October 2026): Classes V to XII, online and
 *     offline, scholarships of up to 100% and cash awards, registration fee ₹200. Used only as
 *     the best-known example of the format.
 *   - TestoZa behaviour: see the header of testMakerData.ts. Paid-plan features per the
 *     pricing page: branding, exam security rules, view/export results, scheduled exams,
 *     batches (all currently unlocked by app_settings.unlock_all_premium; written as paid).
 *   - The slab table and the Excel formula are an example, labelled as one.
 */
import { TEST_MAKER_PAGES } from './testMakerData';
import { compareFallback, scenariosFallback, stepsFallback } from './howtoFallback';
import { SCHOLARSHIP_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const P = TEST_MAKER_PAGES.scholarship;

export const SCHOLARSHIP_ADMISSION_TEST_PLATFORM: Guide = {
    meta: SCHOLARSHIP_META,
    body: {
        intro: [
            html(`
<p>Every admission season, coaching institutes across India run a scholarship test. The national chains do it at enormous scale: Aakash’s ANTHE, the best known, is open to students from Class 5 to Class 12, offers scholarships of up to 100%, and runs both online and in centres. A local institute runs the same idea on a smaller stage, often a Sunday test for a few hundred students from nearby schools.</p>
<p>A scholarship test does three jobs at once. It fills batches, because families who come for a test often stay for the course. It finds strong students, who lift results and word of mouth. And it builds the best enquiry list an institute will get all year: hundreds of families who chose to spend a Sunday morning with you.</p>
<p>Paper and OMR sheets make all three jobs slow. This guide covers how to run a scholarship test on <a href="/">TestoZa</a> instead: at home, in your centre or at partner schools; how to set it so it is fair; how to turn scores into scholarship slabs; and how to follow up. We make TestoZa, and the last section says what it doesn’t do.</p>
`),
        ],

        answer:
            'A scholarship admission test platform should register candidates, run one fair attempt each, rank them, and give you every candidate’s details for follow-up. In TestoZa you add the details candidates type before starting (name, phone, class, school), allow one attempt in a set window, switch on exam rules, and hold results until the day you announce them. Candidates join on their phones with a link or a six-digit code, at home, in your centre or at a school. You get a rank list per class and an Excel sheet with scores and every detail they typed, ready for scholarship slabs and counselling calls. There is no fee per candidate; scheduling, exam rules and the Excel export are on paid plans from ₹49 for 7 days.',

        sections: [
            {
                id: 'goals',
                title: 'What a scholarship test is really for',
                tocLabel: 'The goals',
                kicker: 'The idea',
                blocks: [
                    html(`
<p>Decide the main goal before writing a single question, because it changes the paper, the format and the follow-up.</p>
<div class="al-cards">
<div class="al-card" data-tone="blue" data-icon="key"><h3>Fill batches</h3><p>The test is a reason for families to visit. The paper should be fair to an average student, and results should come with a counselling call.</p></div>
<div class="al-card" data-tone="orange" data-icon="sparkles"><h3>Find toppers</h3><p>The paper needs hard questions that spread out the top 5%, and the biggest scholarships should be decided in a supervised round.</p></div>
<div class="al-card" data-tone="purple" data-icon="doc"><h3>Build the enquiry list</h3><p>The registration details matter most: phone, class, school, the course they want. Every candidate is a lead, whatever their score.</p></div>
</div>
<p>Most institutes want all three, which is fine. Just be honest that the follow-up calls matter as much as the paper. A family that took your test and heard nothing back is a family that joins someone else.</p>
`),
                ],
            },
            {
                id: 'paper-vs-online',
                title: 'A scholarship test on paper, and one online',
                tocLabel: 'Paper or online',
                kicker: 'The difference',
                blocks: [
                    html(`
<p>The questions are the same either way. Everything around them changes.</p>
`),
                    { type: 'widget', widget: 'hw-compare', fallbackHtml: compareFallback(P) },
                ],
            },
            {
                id: 'formats',
                title: 'Choose the format: home, centre, schools or two rounds',
                tocLabel: 'The format',
                kicker: 'How candidates sit it',
                blocks: [
                    html(`
<p>Candidates take a TestoZa test in a phone or computer browser, with no app and no account. That makes several formats possible, and many institutes combine two:</p>
`),
                    { type: 'widget', widget: 'hw-scenarios', fallbackHtml: scenariosFallback(P) },
                    html(`
<p>A sound rule of thumb: the larger the scholarship, the more supervised the sitting. Use home tests for reach and modest scholarships, and decide anything above half the fee in a final round that you can watch.</p>
`),
                ],
            },
            {
                id: 'registration',
                title: 'Registration: ask for what counsellors will use',
                tocLabel: 'Registration',
                kicker: 'Candidate details',
                blocks: [
                    html(`
<p>In TestoZa, registration is the first screen of the test. Under <strong>Candidate inputs</strong> you choose the details candidates type before they start. Name is there by default; add the rest as labels. Each one becomes a column in the results sheet.</p>
<div class="al-table-wrap"><table class="al-table">
<thead><tr><th scope="col">Detail</th><th scope="col">Why ask</th></tr></thead>
<tbody>
<tr><th scope="row">Name</th><td data-label="Why ask">The rank list and the result</td></tr>
<tr><th scope="row">Phone</th><td data-label="Why ask">The counselling call. Ask for a parent’s number for younger students.</td></tr>
<tr><th scope="row">Class</th><td data-label="Why ask">A check that they took the right class’s paper</td></tr>
<tr><th scope="row">School</th><td data-label="Why ask">Which schools send you students, and where to run next year’s test</td></tr>
<tr><th scope="row">City or area</th><td data-label="Why ask">Which centre to invite them to</td></tr>
<tr><th scope="row">Course interested in</th><td data-label="Why ask">JEE, NEET, foundation or boards: who calls them</td></tr>
</tbody>
</table></div>
<p>Keep it short. Every extra box on the first screen loses a few candidates, especially on a phone. Six details is plenty.</p>
<p>For a sitting in your centre with a printed list of registered candidates, a live exam can check candidates in by roll number and PIN instead, with PIN slips you print and hand out at the desk. You can let in walk-ins who aren’t on the list, or refuse them.</p>
`),
                ],
            },
            {
                id: 'fairness',
                title: 'Settings that keep the test fair',
                tocLabel: 'Fairness',
                kicker: 'Settings',
                blocks: [
                    html(`
<p>A scholarship is money, so candidates and parents will ask whether the test was fair. These settings answer that before anyone asks:</p>
<ol class="al-steps">
<li><strong>One attempt per candidate</strong>Set the attempt limit to 1, so nobody retakes the test until they like the score.</li>
<li><strong>A fixed window</strong>For a test link, schedule a start and end time, such as Sunday 10 am to 1 pm. For a live exam, everyone starts together and late entry closes after the minutes you set.</li>
<li><strong>Exam rules</strong>Full screen where the phone allows it, a limit on leaving the test screen that submits the paper, and copy and paste off. These are on the paid plans.</li>
<li><strong>Shuffled questions</strong>So two friends sitting side by side don’t see the same question at the same moment. Leave it off if the paper has passages, so a passage’s questions stay with it.</li>
<li><strong>Results held until you release them</strong>For a live exam, choose “When I release them”. For a test link, switch off Result Visibility so candidates see a “submitted” page, and switch it on on results day. Either way, answers don’t leak while others are still writing.</li>
<li><strong>A tie-break rule, published in advance</strong>Ties happen near every slab boundary. Decide the rule before the test, for example fewer wrong answers ranks higher, and put it on your registration poster.</li>
</ol>
<p class="al-note">If the paper has negative marking, say so on the first screen. A small penalty such as −0.25 discourages blind guessing and spreads the scores out, which makes slabs easier to draw. For students in Class 5 to 8, who may never have met negative marking, leave it off.</p>
`),
                ],
            },
            {
                id: 'slabs',
                title: 'From scores to scholarship slabs',
                tocLabel: 'Slabs',
                kicker: 'Results day',
                blocks: [
                    html(`
<p>TestoZa ranks candidates and gives you their scores. The scholarship each one gets is your decision, and the simplest way to apply it is in the Excel sheet. Slabs can follow rank or percentage. Percentage is easier to explain to parents, rank is easier to budget.</p>
<p>An example of percentage slabs (an illustration, not a recommendation):</p>
<div class="al-table-wrap"><table class="al-table">
<thead><tr><th scope="col">Score</th><th scope="col">Scholarship on tuition fee</th></tr></thead>
<tbody>
<tr><th scope="row">90% and above</th><td data-label="Scholarship">90%</td></tr>
<tr><th scope="row">80% to 89%</th><td data-label="Scholarship">50%</td></tr>
<tr><th scope="row">70% to 79%</th><td data-label="Scholarship">30%</td></tr>
<tr><th scope="row">60% to 69%</th><td data-label="Scholarship">15%</td></tr>
<tr><th scope="row">Below 60%</th><td data-label="Scholarship">Counselling call, admission at the usual fee</td></tr>
</tbody>
</table></div>
<p>In the downloaded sheet, add a column with each candidate’s percentage (score ÷ total marks × 100). If that is column E, one formula in the next column gives every candidate their slab:</p>
<pre><code>=IFS(E2&gt;=90,"90%",E2&gt;=80,"50%",E2&gt;=70,"30%",E2&gt;=60,"15%",TRUE,"Call")</code></pre>
<p>Then sort by slab and give each counsellor their part of the list. Release results in TestoZa on the day you announced. Candidates can look their result up at <a href="/join/result">testoza.com/join/result</a> with the code and the same details they typed at the start. Tell them that their scholarship letter comes from you, not from the result screen.</p>
`),
                ],
            },
            {
                id: 'plan',
                title: 'A plan for the six weeks before results day',
                tocLabel: 'The plan',
                kicker: 'Checklist',
                blocks: [
                    html(`
<p>The test itself takes a morning. The work is in the weeks around it. Here is the part that happens in TestoZa and on your desk:</p>
${stepsFallback(P)}
<p>The trial with your own staff is the step most institutes skip and most regret. Ten staff phones, the real link and a short window will show you a wrong class paper, a missing detail on the first screen or a confusing instruction while there is still time to fix it.</p>
`),
                ],
            },
            {
                id: 'limits',
                title: 'What TestoZa doesn’t do for a scholarship test',
                tocLabel: 'Limits',
                kicker: 'Honest limits',
                blocks: [
                    html(`
<p>Plan around these before you print the posters:</p>
<ul class="al-limits">
<li><strong>Registration fees and payments.</strong> TestoZa doesn’t collect money. If you charge a fee, collect it through your usual payment link and share the test only with those who paid, or use a live exam with a list of registered roll numbers and PINs.</li>
<li><strong>Admit cards and SMS.</strong> There are no admit cards and no SMS or email blasts. PIN slips are the nearest thing for centre sittings; messages go out from your own WhatsApp.</li>
<li><strong>Camera supervision and identity checks.</strong> TestoZa never uses the camera. A home test is on trust, with browser rules; decide big scholarships in a supervised round.</li>
<li><strong>Automatic slabs and certificates.</strong> Slabs are applied in the Excel sheet, and scholarship letters come from you.</li>
<li><strong>Written answers.</strong> Questions are objective or numerical. If your test has an essay or interview round, run it separately.</li>
</ul>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'How do I conduct a scholarship test online?',
                a: 'Make one paper per class in TestoZa, add the details candidates must type (name, phone, class, school), allow one attempt, set the date window and exam rules, and hold results until the day you announce. Share the link or a six-digit code. Candidates take it on their phones; you get a rank list and an Excel sheet with every candidate’s details.',
            },
            {
                q: 'Can candidates take the scholarship test from home?',
                a: 'Yes, with a test link open in a window you schedule. Home sittings can’t be watched, so use them for screening and smaller scholarships, and hold a supervised final round in your centre for the largest awards.',
            },
            {
                q: 'Can I collect phone numbers and school names?',
                a: 'Yes. Under Candidate inputs, add labels such as Phone, Class, School and City. Candidates fill them in before starting, and each becomes a column in the results sheet, next to their score and rank.',
            },
            {
                q: 'How do I stop candidates from taking the test twice?',
                a: 'Set the attempt limit to 1. For sittings in your centre, use a live exam with roll numbers and PINs from a registered list, and refuse walk-ins if you need to.',
            },
            {
                q: 'Can I announce results on a fixed date?',
                a: 'Yes. For a live exam, choose “When I release them”; for a test link, switch off Result Visibility and switch it on on results day. Nobody sees a score until then. Candidates can look their result up at testoza.com/join/result with the details they typed at the start.',
            },
            {
                q: 'Does TestoZa calculate scholarship percentages?',
                a: 'No. It gives you scores, percentages and ranks. Apply your slabs in the downloaded Excel sheet with one formula, then sort the list for your counsellors.',
            },
            {
                q: 'How much does it cost to run a scholarship test?',
                a: 'There is no charge per candidate. Scheduling, exam rules and the Excel export are on the paid plans: ₹49 for 7 days covers a test week, or ₹149 for 30 days and ₹799 a year.',
            },
            {
                q: 'Can different classes take different papers?',
                a: 'Yes. Make one test per class, each with its own link or code, and name the class in the title. Ask for the class as a candidate detail as well, so a candidate on the wrong paper shows up in the sheet.',
            },
        ],

        closingTitle: 'Run a trial this week.',
        closing: [
            html(`
<p>Build a short version of one class’s paper, add your candidate details, and send it to ten colleagues. Look at the sheet it produces. That sheet is your admission list.</p>
<div class="al-paths">
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Have last year’s paper?</span><span class="al-path-what">Upload it and let the AI read it</span></a>
<a class="al-path" href="/create-test" data-icon="pencil"><span class="al-path-who">Setting a new paper?</span><span class="al-path-what">Open the test builder</span></a>
<a class="al-path" href="/user-guide/live-exam-sessions" data-icon="key"><span class="al-path-who">Testing in your centre?</span><span class="al-path-what">See how codes, PINs and the exam room work</span></a>
</div>
<p>Related reading: <a href="/prevent-cheating-in-online-exams">preventing cheating in online exams</a>, <a href="/how-to-conduct-online-exam">how to conduct an online exam</a>, <a href="/online-test-with-negative-marking">online tests with negative marking</a>, <a href="/share-test-on-whatsapp">sharing a test on WhatsApp</a> and <a href="/guides">all guides</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Aakash ANTHE',
                links: [
                    { label: 'What is ANTHE', href: 'https://www.aakash.ac.in/blog/what-is-anthe' },
                    { label: 'ANTHE 2026 dates and registration', href: 'https://www.aakash.ac.in/blog/anthe-2026-exam-dates-registration-admit-card/' },
                ],
            },
            {
                label: 'TestoZa',
                links: [
                    { label: 'Pricing', href: 'https://testoza.com/pricing' },
                    { label: 'Live exam sessions', href: 'https://testoza.com/user-guide/live-exam-sessions' },
                    { label: 'Look up a result', href: 'https://testoza.com/join/result' },
                ],
            },
        ],
    },
};
