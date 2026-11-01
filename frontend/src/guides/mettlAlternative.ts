/**
 * testoza.com/mercer-mettl-alternative — an enterprise proctoring suite next to an exam
 * platform for everyday tests: who each is built for, the device, how much proctoring a
 * practice test needs, marking, what a year costs, and where Mettl wins outright.
 * Written for coaching institute owners, school exam cells and college departments.
 *
 * Mettl facts (checked 15 October 2026, sources in `sources`):
 *   - mettl.com: talent acquisition, talent development, an AI-assisted examination
 *     platform, psychometric, aptitude, coding and English tests, 360-degree feedback,
 *     virtual assessment centres. 6,000+ organisations, 700+ educational institutions,
 *     100+ countries, 25+ languages, 25M assessments a year. "Request a demo" everywhere,
 *     no published price.
 *   - Examination page: 26+ question formats, equation editor, 20+ languages, AI-based
 *     auto proctoring, live proctoring, "proctor the proctor", 3-point authentication,
 *     a secure browser, 200,000+ exams in a day.
 *   - Proctoring page: AI flags, live proctoring with dual-camera 360-degree monitoring,
 *     record and review, a "Credibility Index" report.
 *   - Help centre (system requirements): "Mettl Proctored Assessments are not supported
 *     on Mobile devices (eg. Cellphone / Smartphones / Pads / Tablets)"; not on Edge;
 *     512 kbps for webcam-proctored tests.
 *   - Help centre (creating a test): Correct Marks and Incorrect Marks fields (negative
 *     marks entered with a minus sign), section-wise time.
 *   - Listing sites (Capterra, GetApp) show a starting price around $2,990 a year as a
 *     flat rate. Third-party, so the page calls it that.
 *
 * TestoZa claims: as verified for the earlier alternative guides. Not in the product, and
 * never to be implied: webcam, microphone or screen-recording proctoring, a lockdown
 * browser, identity checks, psychometric or coding tests, certificates, essays, SSO.
 */
import { ALT_RIVALS } from './altData';
import { compareFallback, fitFallback, moveFallback } from './altFallback';
import { METTL_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const R = ALT_RIVALS.mettl;

export const METTL_ALTERNATIVE: Guide = {
    meta: METTL_META,
    body: {
        intro: [
            html(`
<p>Mercer Mettl is a serious product, built for serious moments. When a company screens five thousand graduates, when a university runs a semester exam for students at home, when a certification body needs to know that the person on camera is the person on the ID card, Mettl does a job very few tools can: webcam and AI proctoring, live human proctors, identity checks and a secure browser that locks the computer.</p>
<p>Most people who search for a Mettl alternative are not in that situation. They are a coaching institute running a test every Sunday for every batch, a school exam cell setting unit tests, or a teacher preparing students for JEE, NEET, CUET, SSC or a bank exam. They heard Mettl named as “the online exam platform”, asked for a demo, and found a product designed around somebody else.</p>
<p>The clearest sign is in Mettl’s own help centre. Its system requirements say, in plain words, that Mettl proctored assessments are not supported on mobile devices: not on phones, and not on tablets. A proctored test needs a laptop or desktop with a webcam, a supported browser and a steady connection. For a recruitment drive, that is reasonable. For a batch of 120 students whose only device is a phone, it means most of them can’t take the test from home at all.</p>
<p>This guide is not “Mettl is bad”. It separates the two jobs that both get called an online exam, says which one Mettl is for, and shows what the other job needs: a platform that runs a weekly test and a monthly mock on the phones your students already carry, marks the way Indian papers mark, and publishes its price.</p>
`),
        ],

        answer:
            'If your exams decide hires, degrees or certifications and need webcam proctoring, identity checks and a secure browser, keep Mettl: that is what it is built for, and lighter tools do not replace it. If what you run is weekly tests and mock series for students, use an exam platform built for that. Mettl’s own help centre says its proctored tests do not run on phones or tablets, and it sells by demo and quote. An everyday exam platform runs on the student’s phone with no install, marks +4/−1 with partial credit and numerical ranges, gives an NTA-style screen, lets a whole batch join with a six-digit code, and publishes its price. TestoZa is one: building and running tests is free, with paid plans at ₹49 for 7 days, ₹149 for 30 days and ₹799 a year. It has no camera proctoring, identity checks or certificates.',

        sections: [
            {
                id: 'what-you-use',
                title: 'Two different jobs called “online exam”',
                tocLabel: 'Two different jobs',
                kicker: 'Start here',
                blocks: [
                    html(`
<p>Before comparing features, it helps to name the job. Two very different activities hide under the same words.</p>
<p><strong>A high-stakes sitting</strong> happens once and decides something: a job offer, a degree, a licence. The candidate is often a stranger to the organisation, sitting at home, with a strong reason to cheat. Here you want to see the room, check the face against the ID, lock the computer, and keep a recording for review. Cost per candidate matters less, because the decision is expensive.</p>
<p><strong>Everyday testing</strong> happens every week and informs something: which chapter to revise, which student needs attention, where a batch stands before the real exam. The candidates are your own students. You need volume, low friction and marking that matches the real exam. A camera adds little; a laptop requirement removes half the batch.</p>
<p>Switch on what you actually use Mettl for, or were about to buy it for:</p>
`),
                    { type: 'widget', widget: 'alt-fit', fallbackHtml: fitFallback(R) },
                    html(`
<p>Three honest outcomes:</p>
<ul class="al-list">
<li><strong>Keep Mettl.</strong> If your week is recruitment tests, university semester exams or certifications that need proctoring, you have the right tool. A test platform for coaching institutes would be a step down.</li>
<li><strong>Use both.</strong> Plenty of colleges and training organisations run their high-stakes sittings on an enterprise suite and their practice tests somewhere cheaper and lighter. That is a sensible split, not a compromise.</li>
<li><strong>Switch.</strong> If everything you ticked is weekly tests, mocks and rank lists for students, you are paying for proctoring and a sales process built for a different buyer.</li>
</ul>
`),
                ],
            },
            {
                id: 'phones',
                title: 'The device question: a laptop with a webcam, or the phone in a pocket',
                tocLabel: 'Laptop or phone',
                kicker: 'The crux',
                blocks: [
                    html(`
<p>For an Indian coaching institute, this one question decides more than every other line on a feature list put together.</p>
<p>Mettl’s system requirements, from its own help centre:</p>
<ul class="al-checks">
<li><strong>Proctored tests do not run on mobile devices.</strong> The page says Mettl proctored assessments are not supported on phones, smartphones, pads or tablets.</li>
<li><strong>A laptop or desktop with a webcam</strong> is needed, because the live video feed is how the candidate is monitored.</li>
<li><strong>Supported browsers</strong> are Chrome, Firefox and Safari above set versions. Edge is not supported for proctored tests.</li>
<li><strong>At least 512 kbps</strong> of steady bandwidth for a webcam-proctored test.</li>
<li><strong>A secure browser</strong> may be required for locked-down tests, which is software installed on Windows or macOS.</li>
</ul>
<p>Every one of those makes sense for a recruitment test. Now picture a batch of 120 students preparing for NEET in a district town. Perhaps 30 have a laptop at home. Some of those are shared with a parent who needs it for work. Most have a phone, often a few years old, on mobile data. A test that needs a laptop and a webcam is a test most of them can only take in your building, which is exactly what an online test was meant to avoid.</p>
<h3>What a phone-first exam looks like</h3>
<p>TestoZa starts from the other end. The device we design for is a budget Android on patchy mobile data:</p>
<ul class="al-list">
<li><strong>Nothing to install.</strong> The candidate opens <a href="/join">testoza.com/join</a> in the browser already on the phone and types a six-digit code.</li>
<li><strong>Nothing lost.</strong> Answers save to the server every 20 seconds. If the phone dies or a call takes over the screen, the candidate rejoins, on the same phone or a borrowed one, and carries on.</li>
<li><strong>A screen that fits.</strong> The question palette, Mark for review and Save & Next are laid out for a six-inch screen, not squeezed from a desktop page.</li>
</ul>
<p>Our guide to <a href="/mobile-friendly-online-exam">running an exam on students’ phones</a> covers this in detail, including what happens when the signal drops mid-paper.</p>
`),
                ],
            },
            {
                id: 'side-by-side',
                title: 'Mettl and an everyday exam platform, question by question',
                tocLabel: 'Side by side',
                kicker: 'Side by side',
                blocks: [
                    html(`
<p>Five questions an institute actually asks, with both answers and what each one means in practice:</p>
`),
                    { type: 'widget', widget: 'alt-compare', fallbackHtml: compareFallback(R) },
                ],
            },
            {
                id: 'proctoring',
                title: 'How much proctoring does a practice test need?',
                tocLabel: 'How much proctoring',
                kicker: 'Being realistic',
                blocks: [
                    html(`
<p>Mettl’s proctoring is genuinely strong. Its pages describe AI that flags suspicious behaviour from the webcam and microphone, live proctors watching in real time, a “proctor the proctor” layer, dual-camera 360-degree monitoring, three-point identity checks and a “Credibility Index” report for every candidate. If you need that, few products go further.</p>
<p>The question is whether a weekly practice test needs it. Think about what cheating costs you in each case:</p>
<ul class="al-list">
<li><strong>In a recruitment test,</strong> a cheat gets a job they can’t do. The cost is high and lands on the employer.</li>
<li><strong>In a weekly practice test,</strong> a cheat gets a rank they didn’t earn, and the only person who loses is the student, who now doesn’t know what they don’t know.</li>
</ul>
<p>For practice, the goal is to make the honest path the easy one, not to catch everybody. Camera proctoring also has costs that fall on students: a working camera, a private room, a fast connection, and being recorded at home. Many Indian candidates, sharing one room and one phone with their family, can’t meet those conditions even when they want to.</p>
<h3>What TestoZa does instead</h3>
<p>TestoZa uses rules that work in an ordinary phone browser, with no camera and no microphone:</p>
<ul class="al-checks">
<li><strong>Forced full screen,</strong> so the exam is the only thing on the screen.</li>
<li><strong>Tab switches counted</strong> against a limit you set, which can submit the paper automatically.</li>
<li><strong>Copy, paste and right-click off,</strong> and the back button blocked.</li>
<li><strong>A live list for the teacher:</strong> who is writing, who left the exam screen, who changed device.</li>
<li><strong>Shuffled questions and options,</strong> so neighbours don’t share a paper order.</li>
</ul>
<p>We say plainly that this is a deterrent, not a guarantee. Nothing in a browser can see the room. For an exam that decides something, our own advice is a supervised room, with the paper still on the students’ phones. Our <a href="/prevent-cheating-in-online-exams">guide to preventing cheating in online exams</a> goes through which rule stops which kind of cheating, and where the limits are.</p>
`),
                ],
            },
            {
                id: 'marking',
                title: 'Marking an Indian paper: where the two are close',
                tocLabel: 'Marking',
                kicker: 'The paper itself',
                blocks: [
                    html(`
<p>On marking, Mettl and TestoZa are closer than anywhere else, and it is worth saying so. Mettl’s help centre shows a Correct Marks and an Incorrect Marks field on a test, so you can take 0.25 or 1 mark off for a wrong answer, and sections can have their own time. It supports 26+ question formats and has an equation editor for maths and chemistry.</p>
<p>The differences are in the details Indian entrance papers add, and in the screen your students practise on:</p>
<div class="al-table-wrap"><table class="al-table">
<thead><tr><th scope="col">What the paper needs</th><th scope="col">How TestoZa handles it</th></tr></thead>
<tbody>
<tr><th scope="row">+4 / −1 (JEE Main, NEET)</th><td>Marks and Wrong on every question card; a new question copies the previous one’s.</td></tr>
<tr><th scope="row">+2 / −0.5 (SSC), +1 / −0.25 (bank)</th><td>The same two fields, any decimal, including marks like 0.857 where a section needs them.</td></tr>
<tr><th scope="row">Multiple correct answers</th><td>Partial marks, either proportional or the JEE Advanced rule, chosen per question.</td></tr>
<tr><th scope="row">Numerical answers</th><td>Accepted within a range you set, or exact to two decimals.</td></tr>
<tr><th scope="row">Sections with their own time</th><td>Each section can close on its own clock and stay closed, as SSC Tier 1 and bank prelims now do.</td></tr>
<tr><th scope="row">Hindi or both languages</th><td>Hindi throughout, typed with English letters if that is faster, and bilingual questions.</td></tr>
<tr><th scope="row">The exam screen</th><td>NTA-style: four-colour question palette, Mark for review, Save & Next, one clock for the paper.</td></tr>
</tbody>
</table></div>
<p>If your paper is a standard negative-marked MCQ test, both will mark it correctly. If it is a JEE Advanced mock with partial marks and numerical answers, or a bilingual SSC paper with timed sections, test those exact questions in a trial before you decide anything.</p>
<h3>Getting the paper in</h3>
<p>The slowest part of any test platform is typing questions. In TestoZa you upload last year’s paper as a PDF, or photograph a printed or handwritten page, and the AI reads the questions, options, answer key, diagrams and equations into the builder. You read it once, fix anything it misread, and it is ready. Our <a href="/ai-test-generator">AI test generator guide</a> shows what that looks like with real papers.</p>
`),
                ],
            },
            {
                id: 'cost',
                title: 'What a year of weekly tests actually costs',
                tocLabel: 'What it costs',
                kicker: 'The money',
                blocks: [
                    html(`
<p>Mettl doesn’t publish prices. Every product page leads to “Request a demo”, and the price is a quote based on your volume and the proctoring you choose. Software listing sites have shown a starting figure around $2,990 a year as a flat rate. That is a third-party number, not a quote, so treat it only as a sense of scale: enterprise software, priced for organisations.</p>
<p>The better way to compare is to count your own sittings. Take a typical mid-sized coaching institute:</p>
<ul class="al-list">
<li>3 batches of 120 students = 360 students</li>
<li>1 weekly test each, 4 a month = 1,440 sittings</li>
<li>1 full mock a month each = 360 more</li>
<li><strong>About 1,800 sittings a month, over 21,000 a year</strong></li>
</ul>
<p>Practice tests are where your volume is. Whatever a quote charges per sitting or per proctored minute gets multiplied by that number, and it mostly pays for proctoring that a practice paper doesn’t need.</p>
<p>In TestoZa, those 21,000 sittings cost the same as 21. Building tests, running live exams, marking, rank lists, per-question analysis and report cards are free. Paid plans (₹49 for 7 days, ₹149 for 30 days, ₹799 for a year, billed in rupees) add the exam rules like forced full screen and tab-switch limits, and other extras. There is no per-candidate charge and no cap on how many sit a paper. See <a href="/pricing">pricing</a> for the current list.</p>
`),
                ],
            },
            {
                id: 'move-one-paper',
                title: 'Moving one practice paper, in about 20 minutes',
                tocLabel: 'Moving a paper',
                kicker: 'Try it small',
                blocks: [
                    html(`
<p>Don’t migrate anything. Keep every high-stakes sitting where it is, and run one practice paper the other way:</p>
`),
                    {
                        type: 'widget',
                        widget: 'alt-move',
                        fallbackHtml: moveFallback(R, 'Your proctored exams stay on Mettl the whole time.'),
                    },
                    html(`
<p>Afterwards, look at two numbers: how many of the batch actually sat the paper from home, and how long it took you from PDF to rank list. Those are the two things a phone-first exam platform is supposed to improve. If they didn’t, you have lost twenty minutes, not a contract.</p>
`),
                ],
            },
            {
                id: 'where-mettl-wins',
                title: 'Where Mettl wins, and it isn’t close',
                tocLabel: 'Where Mettl wins',
                kicker: 'Being straight',
                blocks: [
                    html(`
<p>An honest comparison has a column where the other side wins. Here is Mettl’s:</p>
<ul class="al-limits">
<li><strong>Camera and live proctoring.</strong> AI flags from webcam and microphone, live proctors, record and review, dual-camera monitoring, a credibility report per candidate. TestoZa doesn’t use the camera or microphone at all.</li>
<li><strong>Identity checks.</strong> Three-point authentication to make sure the right person is sitting the test. TestoZa checks candidates in by name, roll number and an optional PIN, which is enough for your own students and not enough for strangers.</li>
<li><strong>A lockdown browser.</strong> The Mettl Secure Browser takes over the computer. TestoZa works inside an ordinary browser on purpose, and accepts the limits that brings.</li>
<li><strong>Hiring and psychometrics.</strong> Aptitude, personality, behavioural, coding and English proficiency tests, and virtual assessment centres. TestoZa has none of these.</li>
<li><strong>Scale and compliance.</strong> 200,000+ exams in a day, 25 million assessments a year, and the security and procurement paperwork large organisations need.</li>
<li><strong>Question formats.</strong> 26+ formats, including ones for coding and simulations. TestoZa covers the types Indian school and entrance papers use, not essays, file uploads or code.</li>
</ul>
<p>And here is what TestoZa is not, stated plainly: not a recruitment platform, not a proctoring service, not a university LMS. It builds papers, runs exams on phones, marks them the way Indian exams mark, and reports to teachers and parents.</p>
<p>So the recommendation is not “switch”. Keep the heavy tool for the sittings that need it, and stop paying enterprise prices for the weekly test.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'What is the best Mercer Mettl alternative?',
                a: 'It depends on why you looked at Mettl. For high-stakes hiring or university exams with webcam proctoring, compare other enterprise proctoring suites. For weekly tests and mock series for students, use an exam platform built for that: one that runs on students’ phones, marks +4/−1 with partial credit, lets a batch join with a code, and publishes its price. TestoZa is one, and building and running tests on it is free.',
            },
            {
                q: 'Can students take a Mettl test on a mobile phone?',
                a: 'Not a proctored one. Mettl’s own system requirements say its proctored assessments are not supported on mobile devices, including smartphones and tablets, and need a laptop or desktop with a webcam. Some non-proctored tests may open on other devices, but Mettl recommends a desktop or laptop. TestoZa exams run in the phone’s ordinary browser with nothing to install.',
            },
            {
                q: 'How much does Mettl cost?',
                a: 'Mettl doesn’t publish prices; its pages lead to a demo request and a quote. Software listing sites have shown a starting figure around $2,990 a year as a flat rate, but that is a third-party number and enterprise pricing depends on volume and proctoring. TestoZa is free to build and run tests, with paid plans at ₹49 for 7 days, ₹149 for 30 days and ₹799 a year.',
            },
            {
                q: 'Does TestoZa have webcam or AI proctoring like Mettl?',
                a: 'No. TestoZa doesn’t use the camera or microphone. It uses browser rules: forced full screen, tab switches counted against a limit that can submit the paper, copy, paste and right-click off, a blocked back button, and a live list showing who left the exam screen. For exams that decide something, we recommend a supervised room.',
            },
            {
                q: 'Can TestoZa mark JEE and NEET papers with negative marking?',
                a: 'Yes. Every question has Marks and Wrong fields, so +4 and −1 is two numbers. It also does partial marks on multiple-correct questions (proportional or the JEE Advanced rule), numerical answers within a range, and sections with their own clock, on an NTA-style screen.',
            },
            {
                q: 'Do candidates need accounts?',
                a: 'Not for a live exam. They open testoza.com/join, type the six-digit code and check in by name or roll number, optionally with a four-digit PIN. Answers save every 20 seconds and a candidate can rejoin on another device.',
            },
            {
                q: 'Can I use Mettl and TestoZa together?',
                a: 'Yes, and many organisations should. Run recruitment, certification or semester exams that need proctoring on Mettl, and run weekly tests and mock series on TestoZa. Results from TestoZa export to Excel if you need them in another system.',
            },
            {
                q: 'Is TestoZa suitable for hiring tests?',
                a: 'Not really. It has no identity checks, camera proctoring, psychometric or coding tests, or recruitment workflow. It is built for teachers, coaching institutes and schools testing their own students.',
            },
        ],

        closingTitle: 'Keep the heavy tool for heavy days.',
        closing: [
            html(`
<p>Pick one practice paper and run it on the phones your students already have:</p>
<div class="al-paths">
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Paper already written?</span><span class="al-path-what">Upload the PDF and let the AI read it</span></a>
<a class="al-path" href="/create-test" data-icon="pencil"><span class="al-path-who">Starting from scratch?</span><span class="al-path-what">Build it with +4/−1 and sections</span></a>
<a class="al-path" href="/user-guide/live-exam-sessions" data-icon="key"><span class="al-path-who">Running it for a batch?</span><span class="al-path-what">See how join codes and the exam room work</span></a>
</div>
<p>Related reading: <a href="/mobile-friendly-online-exam">exams on students’ phones</a>, <a href="/prevent-cheating-in-online-exams">preventing cheating in online exams</a>, <a href="/cbt-exam-software">CBT exam software</a>, <a href="/testportal-alternative">Testportal alternative</a> and <a href="/pricing">pricing</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Mercer | Mettl',
                links: [
                    { label: 'Mettl home', href: 'https://mettl.com/en/' },
                    { label: 'Examination platform', href: 'https://mettl.com/en/examination-management-system/' },
                    { label: 'Online proctoring', href: 'https://mettl.com/en/online-remote-proctoring/' },
                    { label: 'System requirements', href: 'https://support.mettl.com/portal/en/kb/articles/system-requirement-for-mettl-assessment-platform' },
                    { label: 'How to create your own test', href: 'https://mettl.com/user-guides/how-to-create-your-own-test/' },
                ],
            },
            {
                label: 'Price figure quoted from a listing site',
                links: [{ label: 'Capterra: Mercer | Mettl examination and proctoring', href: 'https://www.capterra.com/p/264763/Mercer-Mettl-Online-Examination-and-Proctoring-Solutions/' }],
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
