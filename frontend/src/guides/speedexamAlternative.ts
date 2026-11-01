/**
 * testoza.com/speedexam-alternative — an exam service metered by attempts a month, with
 * administrator-issued logins, next to an exam platform with no attempt meter and a join
 * code: the sums at real batch sizes, getting candidates in, Indian papers, proctoring,
 * and where SpeedExam wins. Written for coaching institute owners and exam coordinators.
 *
 * SpeedExam facts (checked 15 October 2026 against speedexam.net, sources in `sources`):
 *   - Pricing (yearly page): Free $0, 25 exam attempts a month, 2,000 questions, 100 MB,
 *     exam monitor, SMS integration, self-registration, phone support. Professional $20 a
 *     month or $240 a year: 500 attempts a month, 10 instructor accounts, 15,000
 *     questions, 50 free proctoring credits, 1 GB. Ultimate $125 a month or $1,500 a
 *     year: 3,500 attempts a month, 25 instructors, 50,000 questions, 150 credits, 3 GB.
 *     "Exam attempts per month (Includes incomplete and retake attempts)".
 *   - Home page: "Secure, easy-to-use Online exam software to create, conduct, and
 *     evaluate online exams from anywhere"; education, corporate and government; offices
 *     in India and the United States; 15,000+ customers in 128 countries; "Mobile & Tablet
 *     Friendly"; "Direct student accounts are managed by the Test Administrator";
 *     ProctorLite image capture, audio and video proctoring, AI audio-video proctoring;
 *     GDPR, ISO 27001, ISO 9001, SOC 2.
 *   - Features pages: negative marking as an exam setting, sections, 10 question types
 *     (MCQ, multiple correct, fill in the blank, matching, drag and match, yes/no,
 *     true/false, essay, scenario-based, audio/video), certificates and a certificate maker.
 *   - Listing sites show other prices for the same tiers ($37 a month, $180 a year); the
 *     page quotes SpeedExam's own pricing page only.
 *
 * TestoZa claims: as verified for the earlier alternative guides. Not in the product, and
 * never to be implied: webcam, audio or AI proctoring, certificates, essays, audio or
 * video questions, SMS integration, ISO or SOC 2 certification, candidate self-registration.
 */
import { ALT_RIVALS } from './altData';
import { compareFallback, fitFallback, moveFallback } from './altFallback';
import { SPEEDEXAM_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const R = ALT_RIVALS.speedexam;

/** Attempts in a month: students × tests, plus a retake rate. */
const attempts = (students: number, tests: number, retakes = 0.1) => Math.round(students * tests * (1 + retakes));
const plan = (n: number) => (n <= 25 ? 'Free' : n <= 500 ? 'Professional' : n <= 3500 ? 'Ultimate' : 'Above Ultimate');

const ROWS = [
    { who: 'One batch of 60, a weekly test', students: 60, tests: 4 },
    { who: 'One batch of 120, a weekly test', students: 120, tests: 4 },
    { who: '3 batches of 120, weekly test + monthly mock', students: 360, tests: 5 },
    { who: '6 batches of 120, weekly test + monthly mock', students: 720, tests: 5 },
];

export const SPEEDEXAM_ALTERNATIVE: Guide = {
    meta: SPEEDEXAM_META,
    body: {
        intro: [
            html(`
<p>SpeedExam is a capable online exam service. It has negative marking and sections, ten question types including essays and audio or video answers, three levels of proctoring from simple image capture to AI audio-video monitoring, certificates, and the security certifications corporate buyers ask for. It says it serves more than 15,000 customers in 128 countries, across education, companies and government.</p>
<p>So when a coaching institute in India searches for a SpeedExam alternative, it is rarely because the exams don’t work. It is usually because of two things that only show up once you run a test series every week.</p>
<p><strong>The meter counts attempts.</strong> SpeedExam’s plans are measured in exam attempts a month, and its pricing page says the count includes incomplete attempts and retakes. The free plan has 25, Professional has 500 at $20 a month, and Ultimate has 3,500 at $125 a month. A weekly test for one batch of 120 students uses about 480 attempts before anybody retakes anything, nearly the whole Professional allowance.</p>
<p><strong>Candidates need logins.</strong> SpeedExam’s site says student accounts are managed by the test administrator. That is tidy for an organisation with a stable list of candidates. For a coaching institute with new admissions every month, it means issuing, resetting and chasing passwords, often on the morning of the exam.</p>
<p>This guide does the attempt sums at real batch sizes, compares the two products question by question, and is honest about where SpeedExam is the better choice.</p>
`),
        ],

        answer:
            'SpeedExam is a solid exam service with negative marking, sections, proctoring and certificates, so the reasons to switch are about fit. Its plans are metered by exam attempts a month, counting incomplete attempts and retakes (25 free, 500 on Professional at $20 a month, 3,500 on Ultimate at $125 a month), and candidates use accounts the administrator manages. A coaching institute running weekly tests and mocks for several batches uses thousands of attempts a month and spends time managing logins. TestoZa has no attempt meter and no logins to issue: a batch joins with a six-digit code, papers mark +4/−1 with JEE Advanced partial marks and numerical ranges on an NTA-style screen, and building and running tests is free, with paid plans at ₹49 for 7 days, ₹149 for 30 days or ₹799 a year. Keep SpeedExam for exams that need camera proctoring or certificates.',

        sections: [
            {
                id: 'what-you-use',
                title: 'What you run exams for',
                tocLabel: 'What you use it for',
                kicker: 'Start here',
                blocks: [
                    html(`
<p>SpeedExam is built for a wide range of organisations, from hospitals and banks certifying staff to colleges running semester exams. A coaching institute uses a narrow slice of it, very often. Which slice you use decides whether it is the right tool.</p>
<p>Switch on what you actually use it for:</p>
`),
                    { type: 'widget', widget: 'alt-fit', fallbackHtml: fitFallback(R) },
                    html(`
<p>If you ticked camera proctoring and certificates, SpeedExam is doing real work for you. If your ticks are all in the second group, keep reading: the next section is about the number that grows fastest.</p>
`),
                ],
            },
            {
                id: 'attempts',
                title: 'The meter counts attempts, retakes included',
                tocLabel: 'The attempt meter',
                kicker: 'The crux',
                blocks: [
                    html(`
<p>From SpeedExam’s own pricing page:</p>
<ul class="al-checks">
<li><strong>Free:</strong> 25 exam attempts a month, 2,000 questions, 100 MB of storage.</li>
<li><strong>Professional:</strong> $20 a month or $240 a year. 500 attempts a month, 10 instructor accounts, 15,000 questions, 50 free proctoring credits.</li>
<li><strong>Ultimate:</strong> $125 a month or $1,500 a year. 3,500 attempts a month, 25 instructor accounts, 50,000 questions, 150 free proctoring credits.</li>
<li><strong>What counts:</strong> “Exam attempts per month (Includes incomplete and retake attempts)”.</li>
</ul>
<p>An attempt is one candidate starting one exam. So the number you need is students × tests a month, plus whatever retakes and abandoned starts you get. Here it is for four common institute sizes, with a modest 10% added for retakes and restarts:</p>
<div class="al-table-wrap"><table class="al-table">
<thead><tr><th scope="col">Your institute</th><th scope="col">Attempts a month</th><th scope="col">SpeedExam plan needed</th><th scope="col" class="al-us">TestoZa</th></tr></thead>
<tbody>
${ROWS.map((r) => {
    const n = attempts(r.students, r.tests);
    return `<tr><th scope="row">${r.who}</th><td>about ${n.toLocaleString('en-IN')}</td><td>${plan(n)}</td><td class="al-us">No meter</td></tr>`;
}).join('\n')}
</tbody>
</table></div>
<p>Two things stand out. First, one ordinary batch of 120 with a weekly test uses about 480 attempts before anyone retakes, and a few retakes push it past Professional’s 500 into Ultimate. Second, an institute with six such batches and a monthly mock goes past the 3,500 on Ultimate. Then you are talking to sales about a bigger plan, in dollars.</p>
<h3>Why retakes matter</h3>
<p>Counting retakes and incomplete attempts is fair from the vendor’s side, because each one uses the system. But it pushes you against good teaching. Letting a student re-attempt a chapter test after revising is one of the most useful things you can do, and a meter that charges for it makes you think twice.</p>
<p>TestoZa has no meter on attempts, candidates or tests. One mock for 400 candidates is one mock, and a retake costs nothing. Building tests, running live exams, marking, rank lists and report cards are free; paid plans (₹49 for 7 days, ₹149 for 30 days or ₹799 a year, billed in rupees) add the exam rules and extras.</p>
`),
                ],
            },
            {
                id: 'side-by-side',
                title: 'SpeedExam and TestoZa, question by question',
                tocLabel: 'Side by side',
                kicker: 'Side by side',
                blocks: [
                    html(`
<p>Five questions an exam coordinator actually asks, with both answers and what each means for you:</p>
`),
                    { type: 'widget', widget: 'alt-compare', fallbackHtml: compareFallback(R) },
                ],
            },
            {
                id: 'logins',
                title: 'Logins or a join code: the exam-morning question',
                tocLabel: 'Logins or a code',
                kicker: 'Exam day',
                blocks: [
                    html(`
<p>Think about 9:55 on a Sunday morning, five minutes before a mock for 120 students.</p>
<p>With accounts, every candidate needs a username and a password that works. Some have forgotten it. Some typed it wrong when they changed it. A few never got the message with their login. Each one is a call or a WhatsApp to the coordinator, while the rest of the batch waits. SpeedExam supports self-registration too, which helps, but someone still has to manage the list.</p>
<p>Accounts are worth that cost when a candidate takes many exams over a long period and you need a history per person, such as an employee doing certifications year after year. For a coaching batch sitting a weekly test, the history that matters is the rank list and the report card, and you get those without accounts.</p>
<h3>How a join code works</h3>
<ol class="al-list al-list--num">
<li><strong>You start a live exam</strong> for a batch and get a six-digit code, a QR code and a projector view.</li>
<li><strong>Candidates open <a href="/join">testoza.com/join</a></strong> on their phones, type the code and check in by name or roll number. If you want, each has a four-digit PIN printed on a slip.</li>
<li><strong>You watch the lobby fill,</strong> so you know who is missing before you press Start, not after.</li>
<li><strong>During the exam,</strong> the live list shows who is writing, who has submitted and who left the exam screen. You can give one candidate +5 or +10 minutes, or give everyone more time.</li>
<li><strong>If a phone dies,</strong> the candidate rejoins on another device and carries on, because answers save to the server every 20 seconds.</li>
</ol>
<p>Batches are lists you paste from Excel or WhatsApp: roll number, name, and a parent’s phone if you want report cards to go home. A new admission is one more line in the list, not a new account.</p>
`),
                ],
            },
            {
                id: 'indian-paper',
                title: 'Marking and the exam screen for Indian papers',
                tocLabel: 'Indian papers',
                kicker: 'The paper itself',
                blocks: [
                    html(`
<p>On basic marking the two tools are level. SpeedExam has negative marking as an exam setting and supports sections; TestoZa has Marks and Wrong on every question and sections with their own clock. A standard +4/−1 paper will mark correctly on either.</p>
<p>The differences are in the details Indian entrance papers add:</p>
<ul class="al-checks">
<li><strong>An NTA-style screen.</strong> The four-colour question palette, Mark for review, Save & Next and one clock, the screen JEE, NEET and CUET candidates will see on the day.</li>
<li><strong>JEE Advanced partial marks</strong> on multiple-correct questions, or proportional marks, per question.</li>
<li><strong>Numerical answers within a range,</strong> or exact to two decimals, as JEE Main Section B and JEE Advanced mark them.</li>
<li><strong>Sections that lock</strong> when their own time runs out, as SSC Tier 1 and bank prelims now work.</li>
<li><strong>Hindi and bilingual papers,</strong> including typing Hindi with English letters.</li>
</ul>
<h3>Getting the paper in</h3>
<p>Most institutes already have their papers as PDFs or printed sheets. In TestoZa you upload the PDF or photograph the page, and the AI reads the questions, options, answer key, diagrams and equations into the builder, in Hindi, English or both. You read it once, fix anything it misread, and it is ready. For a 30-question paper that takes minutes, not an evening. Our <a href="/ai-test-generator">AI test generator guide</a> and <a href="/chemistry-question-paper-maker">chemistry paper maker guide</a> show it on real papers.</p>
`),
                ],
            },
            {
                id: 'proctoring',
                title: 'Proctoring: how much does a practice test need?',
                tocLabel: 'Proctoring',
                kicker: 'Being realistic',
                blocks: [
                    html(`
<p>SpeedExam offers three levels of proctoring: ProctorLite, which captures images at intervals; audio and video proctoring, live or recorded; and AI audio-video proctoring that can stop an exam automatically. Proctoring credits come with the paid plans. For a certification exam or a recruitment test, that is valuable.</p>
<p>For a weekly practice test, it is usually more than you need, and the costs fall on the student: a working camera, a quiet private room, and data for video. TestoZa doesn’t use the camera or microphone. It uses rules that work in an ordinary phone browser:</p>
<ul class="al-list">
<li>Forced full screen, so the exam is the only thing on the screen.</li>
<li>Tab switches counted against a limit you set, which can submit the paper.</li>
<li>Copy, paste and right-click off, and the back button blocked.</li>
<li>A live list showing who left the exam screen or changed device.</li>
</ul>
<p>That is a deterrent, not a guarantee, and we say so. For an exam that decides something, run it in a supervised room, with the paper still on the students’ phones. Our <a href="/prevent-cheating-in-online-exams">guide to preventing cheating in online exams</a> goes through what each rule stops.</p>
`),
                ],
            },
            {
                id: 'move-one-paper',
                title: 'Moving the paper that uses most attempts',
                tocLabel: 'Moving a paper',
                kicker: 'Try it small',
                blocks: [
                    html(`
<p>Keep your certified and proctored exams where they are. Move the one paper that burns most of your monthly attempts:</p>
`),
                    { type: 'widget', widget: 'alt-move', fallbackHtml: moveFallback(R, 'Proctored and certified exams stay on SpeedExam.') },
                    html(`
<p>Then look at three things: how many login problems you had (there should be none), how many attempts that paper would have used on your plan, and whether the rank list and per-question numbers were useful. That tells you whether to move the next one.</p>
`),
                ],
            },
            {
                id: 'checklist',
                title: 'Five questions to answer before you choose',
                tocLabel: 'Before you choose',
                kicker: 'Deciding',
                blocks: [
                    html(`
<p>Answer these with your own numbers before any demo or trial. They settle most of the decision on their own.</p>
<ol class="al-list al-list--num">
<li><strong>How many attempts will you use in your busiest month?</strong> Students × tests, plus retakes, abandoned starts and any scholarship test for outside students. Compare that with the plan’s allowance, not your average month.</li>
<li><strong>How will candidates get in on exam morning?</strong> Picture the five minutes before a mock. If the answer involves resetting passwords, count how many calls that is for your biggest batch.</li>
<li><strong>Can it hold your exam’s hardest questions?</strong> Build a JEE numerical, a JEE Advanced multiple-correct question and a timed section in the trial, exactly as the real paper has them.</li>
<li><strong>How much proctoring do your tests really need?</strong> If most are practice papers, browser rules and a live list may be enough, and you shouldn’t pay for camera proctoring on every attempt.</li>
<li><strong>What does a year cost in rupees?</strong> For dollar plans, include the exchange rate and card fees, and the next plan up for the month you outgrow the allowance.</li>
</ol>
<p>If the honest answers are “thousands of attempts, a code would be easier, Indian question types, practice papers, rupees”, an exam platform with no meter fits better. If they are “a few hundred attempts, certified exams, proctoring on every sitting”, SpeedExam is a sound choice.</p>
`),
                ],
            },
            {
                id: 'where-speedexam-wins',
                title: 'Where SpeedExam wins',
                tocLabel: 'Where SpeedExam wins',
                kicker: 'Being straight',
                blocks: [
                    html(`
<p>SpeedExam is the better choice for a real set of jobs:</p>
<ul class="al-limits">
<li><strong>Camera and AI proctoring.</strong> Image capture, audio and video monitoring, and AI that can stop an exam. TestoZa uses no camera or microphone.</li>
<li><strong>Certificates.</strong> A certificate maker and certificates after an exam. TestoZa doesn’t issue certificates.</li>
<li><strong>Corporate and government exams.</strong> GDPR, ISO 27001, ISO 9001 and SOC 2 compliance, which procurement teams require. TestoZa is built for teachers and institutes, not that buying process.</li>
<li><strong>Open-ended and media questions.</strong> Essays, scenario-based questions, matching, drag and match, and audio or video answers. TestoZa covers the types Indian school and entrance papers use.</li>
<li><strong>Accounts and history per candidate.</strong> Useful when the same person takes many exams over years. TestoZa keeps history by batch and roll number, not by personal account.</li>
<li><strong>SMS integration and self-registration,</strong> built into the free plan.</li>
</ul>
<p>So for an institute that also runs certified or proctored exams, the sensible answer is both: SpeedExam for those, and an exam platform with no attempt meter for the weekly test series.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'What is the best SpeedExam alternative for coaching institutes?',
                a: 'One without a per-attempt meter and without logins to manage, built for Indian papers. TestoZa lets a batch join with a six-digit code, marks +4/−1 with JEE Advanced partial marks and numerical ranges on an NTA-style screen, and is free to build and run tests, with paid plans at ₹49 for 7 days, ₹149 for 30 days or ₹799 a year.',
            },
            {
                q: 'How much does SpeedExam cost?',
                a: 'From SpeedExam’s pricing page on 15 October 2026: Free with 25 exam attempts a month; Professional at $20 a month or $240 a year for 500 attempts; Ultimate at $125 a month or $1,500 a year for 3,500 attempts. Attempts include incomplete attempts and retakes. Check the live page, as prices change.',
            },
            {
                q: 'What counts as an exam attempt on SpeedExam?',
                a: 'SpeedExam’s pricing page describes the limit as exam attempts per month, including incomplete and retake attempts. Each candidate starting an exam uses one, so a batch of 120 sitting four weekly tests uses about 480 before retakes.',
            },
            {
                q: 'Does TestoZa limit the number of exams or candidates?',
                a: 'No. There is no cap on attempts, candidates or tests. Building and running tests is free; the paid plans add exam rules such as forced full screen and tab-switch limits, and other extras.',
            },
            {
                q: 'Do candidates need logins on TestoZa?',
                a: 'Not for a live exam. They open testoza.com/join, type the six-digit code and check in by name or roll number, optionally with a four-digit PIN. You paste the batch list from Excel or WhatsApp instead of creating accounts.',
            },
            {
                q: 'Does TestoZa have webcam proctoring like SpeedExam?',
                a: 'No. TestoZa uses browser rules without a camera: forced full screen, a tab-switch limit that can submit the paper, copy and right-click off, a blocked back button and a live list of who left the exam screen. For exams that decide something, a supervised room is recommended.',
            },
            {
                q: 'Can I move my SpeedExam question bank to TestoZa?',
                a: 'There is no direct import between the two. The quickest route is paper by paper: upload the original PDF or a printed copy of each paper to the AI test generator, which reads questions, options, the key, diagrams and equations, then set the marks and duration.',
            },
            {
                q: 'Can I use SpeedExam and TestoZa together?',
                a: 'Yes. Use SpeedExam for certified or camera-proctored exams, and TestoZa for the weekly tests and mock series that use most attempts. TestoZa results export to Excel.',
            },
        ],

        closingTitle: 'No meter, no logins, no excuses.',
        closing: [
            html(`
<p>Pick the paper that uses most of your attempts, and run it once:</p>
<div class="al-paths">
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Paper already written?</span><span class="al-path-what">Upload the PDF and let the AI read it</span></a>
<a class="al-path" href="/create-test" data-icon="pencil"><span class="al-path-who">Starting from scratch?</span><span class="al-path-what">Build it with +4/−1 and sections</span></a>
<a class="al-path" href="/user-guide/live-exam-sessions" data-icon="key"><span class="al-path-who">Running it for a batch?</span><span class="al-path-what">See how join codes and the exam room work</span></a>
</div>
<p>Related reading: <a href="/how-to-conduct-online-exam">how to conduct an online exam</a>, <a href="/cbt-exam-software">CBT exam software</a>, <a href="/full-length-online-test-maker">full-length mock tests</a>, <a href="/mercer-mettl-alternative">Mercer Mettl alternative</a> and <a href="/pricing">pricing</a>.</p>
`),
        ],

        sources: [
            {
                label: 'SpeedExam',
                links: [
                    { label: 'SpeedExam home', href: 'https://www.speedexam.net/' },
                    { label: 'Pricing (yearly)', href: 'https://www.speedexam.net/pricing/yearly/' },
                    { label: 'Features', href: 'https://www.speedexam.net/features/' },
                    { label: 'Question types', href: 'https://www.speedexam.net/feature/question-types/' },
                    { label: 'Remote proctoring', href: 'https://www.speedexam.net/feature/remote-online-proctoring/' },
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
