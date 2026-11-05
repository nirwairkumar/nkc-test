/**
 * testoza.com/best-proctoring-software — eleven online proctoring tools sorted by the stakes
 * of the exam and the devices candidates own: webcam and ID suites for hiring, licences and
 * finals; LMS proctoring for universities; locked browsers for labs; browser rules for
 * weekly tests on phones. Written for exam coordinators, institute owners and teachers.
 *
 * Not the same page as /online-proctoring-software (TestoZa's own landing page) or
 * /prevent-cheating-in-online-exams (methods, not tools). This one is the comparison list.
 *
 * Facts and where they come from (sources in `sources`), checked 5 November 2026:
 *   - Mercer Mettl: as checked for mettlAlternative.ts (AI webcam and microphone flags, live
 *     proctors, dual camera, three-point ID check, secure browser, credibility report,
 *     "200,000+ exams in a day"; help centre: proctored assessments not supported on
 *     phones or tablets, laptop/desktop with webcam, 512 kbps; no price, Capterra ~$2,990 a
 *     year, third-party).
 *   - Talview (talview.com): Alvy AI proctoring with continuous liveness and face matching,
 *     secondary-camera view, locked browser; automated, record-and-review or live; names the
 *     app or device behind a flag; "The final call to qualify or disqualify stays with you";
 *     integrations Moodle, Canvas, Workday; candidate apps on App Store and Google Play;
 *     SOC 2, ISO 27001; price on request.
 *   - Eklavvya: as in bestOnlineExamSoftwareIndia.ts (AI, audio and 360° proctoring on
 *     Enterprise only; per exam credit; 25 free).
 *   - Proctorio (proctorio.com, /requirements): Windows 10+, macOS 13+ with Chrome, Edge,
 *     Brave or Opera; ChromeOS; Ubuntu; phones (iOS 13.4+, Android 7+) only through the
 *     Proctorio Mobile App, a paid add-on ("Mobile Integrity"); webcam 320×240 or better;
 *     live proctoring needs 5 Mbps down; "300 million+" exams (vendor figure); no public
 *     price. Ohio University: student-pay $3 an exam from 1 July 2026 (one campus's price).
 *   - Honorlock (honorlock.com): AI monitoring with live proctors who "pop in"; cell phone
 *     detection, AI blocking, ID verification, second camera, BrowserGuard, Search & Destroy
 *     (finds leaked questions online); Canvas, Blackboard, Brightspace, Moodle; SOC 2 Type 2;
 *     24/7 support; price on request.
 *   - Respondus (web.respondus.com): LockDown Browser locks the browser on a computer or
 *     tablet (no copying, printing, other apps or sites; blocks virtual machines, remote
 *     desktops, screen sharing; no exit until submitted); Blackboard, Brightspace, Canvas,
 *     Moodle, Sakai, Schoology; annual licence = unlimited use at the institution, with 200
 *     free seats of Respondus Monitor (its webcam add-on); "over 2000" institutions; free
 *     2-month pilot. University help pages: Windows, Mac, iPad, Chromebook (with limits);
 *     Android and iPhone not supported.
 *   - ProctorU / Meazure Learning: Live+ (live proctor) and Record+ (recorded, reviewed);
 *     Oklahoma State's student price list: Live+ $16.80 (60 min or less) to $32.55
 *     (181–240 min), Record+ $6.30; the institution chooses who pays.
 *   - AutoProctor (autoproctor.co/pricing): credits, "1 attempt (standard proctoring) = 1
 *     credit = ₹9"; Standard ₹1,350 a month for 150 credits (also quarterly, yearly; Premium
 *     and Elite cost more for more features); add-ons per attempt: ID card +4, impersonation
 *     +4, auxiliary device (phone paired for 360°) +4, session recording +4, candidate video
 *     +15; 10 free credits; timer-only tests use no credits; works with Google Forms and
 *     Microsoft Forms; card payment via Stripe, UPI not accepted.
 *   - Safe Exam Browser: free, open source (Mozilla Public Licence), Windows, macOS and iOS
 *     (Moodle docs); built-in support in Moodle.
 *   - Google Forms locked mode: school-managed Chromebooks only (Google help).
 *   - DPDP Act 2023 s.9: verifiable parental consent for under-18s and no tracking or
 *     behavioural monitoring of children; DPDP Rules notified 14 November 2025 with most
 *     duties phased in over 18 months, and an exemption for educational institutions limited
 *     to educational activities and children's safety (law-firm commentary). The page gives
 *     no legal advice; it says to ask.
 *   - Statcounter, India, September 2026: Android 93.89% of mobile.
 *
 * TestoZa claims: see comparisonData.ts header. Never a camera, microphone, screen
 * recording, ID check, AI flag or lockdown browser.
 */
import { COMPARISON_PAGES } from './comparisonData';
import { compareFallback, scenariosFallback, stepsFallback } from './howtoFallback';
import { PROCTORING_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const P = COMPARISON_PAGES.proctoring;

export const BEST_PROCTORING_SOFTWARE: Guide = {
    meta: PROCTORING_META,
    body: {
        intro: [
            html(`
<p>“Proctoring software” covers products that have very little in common. At one end, a free browser locks a lab computer so students can’t open anything else. At the other, a live proctor watches a candidate through a webcam while software checks their face against their ID every few seconds. Lists of the “best proctoring software” usually rank all of these in one column, which is why they are hard to use.</p>
<p>This guide sorts eleven tools by two questions that decide almost everything: <strong>what does the exam decide</strong> (a job, a licence, a degree, or a weekly practice mark), and <strong>what device will the candidate sit it on</strong> (a laptop with a webcam, a lab computer, or a phone). It is honest about what each kind of proctoring can and can’t see, because no software sees everything.</p>
<p>We make <a href="/">TestoZa</a>, which is on this list in the lightest category: it uses browser rules and never switches on a camera. That is why every other tool is described only from its own website and help pages, and why the guide says clearly when you need something heavier than ours.</p>
`),
        ],

        answer:
            'The best proctoring software depends on the stakes and the device. For hiring, certification and university exams taken at home on laptops, use a webcam-and-ID suite: Mercer Mettl or Talview for hiring, Proctorio, Honorlock or Respondus Monitor inside a university LMS, ProctorU for live human proctors. For exams in a computer lab, a locked browser is enough: Safe Exam Browser is free, Respondus LockDown Browser plugs into your LMS. For a test already in Google Forms, AutoProctor adds proctoring from ₹9 an attempt. For weekly tests that students take on their phones, camera proctoring mostly isn’t possible; TestoZa uses browser rules instead: full screen, counted tab switches, copy and paste off, and one device per seat.',

        sections: [
            {
                id: 'at-a-glance',
                title: 'The eleven tools at a glance',
                tocLabel: 'At a glance',
                kicker: 'The list',
                blocks: [
                    html(`
<p>Grouped from the heaviest proctoring to the lightest. The numbers match the reviews below. They are not scores.</p>
<div class="al-table-wrap al-table-wrap--wide"><table class="al-table">
<thead><tr><th scope="col">Tool</th><th scope="col">Kind</th><th scope="col">Candidate needs</th><th scope="col">Price</th></tr></thead>
<tbody>
<tr><th scope="row">1. Mercer Mettl</th><td data-label="Kind">Full suite: AI and live proctors, ID checks, secure browser</td><td data-label="Candidate needs">Laptop or desktop with a webcam</td><td data-label="Price">Quote after a demo</td></tr>
<tr><th scope="row">2. Talview</th><td data-label="Kind">AI proctoring with face matching, record-and-review or live</td><td data-label="Candidate needs">Webcam; candidate apps for phones</td><td data-label="Price">Quote after a demo</td></tr>
<tr><th scope="row">3. Eklavvya</th><td data-label="Kind">Exam platform with proctoring and descriptive marking</td><td data-label="Candidate needs">Webcam for remote; or an exam centre</td><td data-label="Price">25 exam credits free; paid plans quoted</td></tr>
<tr><th scope="row">4. ProctorU (Meazure Learning)</th><td data-label="Kind">Live human proctors, or recorded and reviewed</td><td data-label="Candidate needs">Computer with webcam, booked slot for live</td><td data-label="Price">Per exam; universities list about $6 to $33</td></tr>
<tr><th scope="row">5. Proctorio</th><td data-label="Kind">Browser extension, AI flags, optional live proctor</td><td data-label="Candidate needs">Computer with Chrome, Edge, Brave or Opera; phones only via a paid add-on</td><td data-label="Price">Institution contract</td></tr>
<tr><th scope="row">6. Honorlock</th><td data-label="Kind">AI monitoring with live proctors who step in</td><td data-label="Candidate needs">Computer with webcam, through your LMS</td><td data-label="Price">Institution contract</td></tr>
<tr><th scope="row">7. Respondus</th><td data-label="Kind">LockDown Browser, plus Monitor for webcam</td><td data-label="Candidate needs">Windows, Mac, iPad or Chromebook; no Android</td><td data-label="Price">Annual institution licence</td></tr>
<tr><th scope="row">8. AutoProctor</th><td data-label="Kind">Proctoring added to Google Forms, Microsoft Forms and others</td><td data-label="Candidate needs">Webcam device; extras for ID and second camera</td><td data-label="Price">₹9 per standard attempt; plans from ₹1,350 a month</td></tr>
<tr><th scope="row">9. Safe Exam Browser</th><td data-label="Kind">Free locked browser for lab and laptop exams</td><td data-label="Candidate needs">Windows, macOS or iPad, with it installed</td><td data-label="Price">Free, open source</td></tr>
<tr><th scope="row" class="al-us">10. TestoZa</th><td data-label="Kind" class="al-us">Browser rules: full screen, counted tab switches, copy and paste off, one device per seat</td><td data-label="Candidate needs" class="al-us">Any phone or computer browser, no install</td><td data-label="Price" class="al-us">Basic rules free; strict rules ₹49 / 7 days, ₹149 / 30 days, ₹799 / year</td></tr>
<tr><th scope="row">11. Google Forms locked mode</th><td data-label="Kind">Keeps students inside the quiz</td><td data-label="Candidate needs">A school-managed Chromebook</td><td data-label="Price">Free with Google Workspace for Education</td></tr>
</tbody>
</table></div>
<p class="al-note">Prices in US dollars are as published by each company or by universities that use them, and change often. “Quote after a demo” means the product’s own website shows no price.</p>
`),
                ],
            },
            {
                id: 'two-questions',
                title: 'The two questions that pick your proctoring',
                tocLabel: 'Two questions',
                kicker: 'Method',
                blocks: [
                    html(`
<h3>1. What does the exam decide?</h3>
<p>The more a result is worth to the candidate, the harder they will try to cheat, and the more proof you will need if a result is challenged. A recruitment test, a professional licence or a university final decides something about a person’s future, often a stranger’s. That justifies an ID check, a webcam and a reviewer. A weekly practice test decides nothing: a student who cheats on it mostly cheats themselves. Heavy proctoring there costs more trust than it saves.</p>
<h3>2. What will the candidate sit it on?</h3>
<p>Almost every camera-based tool assumes a laptop or desktop with a webcam. Mettl’s own help centre says its proctored tests aren’t supported on phones or tablets. Respondus LockDown Browser has no Android version. Proctorio reaches phones only through a paid mobile add-on. In India, Statcounter puts Android at 93.9% of mobile phones, and many students own a phone but not a laptop. A laptop-and-webcam rule doesn’t only decide how candidates are watched; it decides who can sit the exam at all.</p>
<p>Put the two answers together and the shortlist picks itself:</p>
<ul class="al-list">
<li><strong>High stakes, laptops:</strong>a webcam-and-ID suite (reviews 1–7).</li>
<li><strong>High stakes, phones only:</strong>hold the exam in a centre or lab on your machines, with a locked browser (reviews 7 and 9) and an invigilator.</li>
<li><strong>Any stakes, test already in Google or Microsoft Forms:</strong>an add-on (review 8).</li>
<li><strong>Low stakes, phones:</strong>browser rules (reviews 10 and 11).</li>
</ul>
`),
                ],
            },
            {
                id: 'what-it-sees',
                title: 'What camera proctoring sees, and what browser rules see',
                tocLabel: 'What it sees',
                kicker: 'The big split',
                blocks: [
                    html(`
<p>Every proctoring tool is a trade. More watching stops more cheating, and asks more of the candidate: a better device, an install, a quiet private room, and their face and voice on record. Here is the trade, side by side.</p>
`),
                    { type: 'widget', widget: 'hw-compare', fallbackHtml: compareFallback(P) },
                    html(`
<p>Neither side is better. They are built for different exams. The mistake is buying webcam proctoring for a weekly practice test, or relying on browser rules for a hiring test where a stranger has every reason to bring help.</p>
`),
                ],
            },
            {
                id: 'which-one',
                title: 'Which proctoring fits your exam: six situations',
                tocLabel: 'Which one fits you',
                kicker: 'Your situation',
                blocks: [
                    html(`
<p>If you only read one part of this page, read the card for your situation.</p>
`),
                    { type: 'widget', widget: 'hw-scenarios', fallbackHtml: scenariosFallback(P) },
                ],
            },
            {
                id: 'suites',
                title: 'Full proctoring suites for hiring and certification',
                tocLabel: 'Full suites',
                kicker: 'Reviews 1–3',
                blocks: [
                    html(`
<p>These are complete assessment platforms with proctoring built in. You build the test in them, candidates sit it in them, and you get a report on each candidate’s behaviour alongside the score.</p>

<h3>1. Mercer Mettl: best for hiring and university exams in India</h3>
<p>Mercer Mettl is one of the best-known assessment names in India. Its proctoring is among the most complete available: AI that flags behaviour from the webcam and microphone, live human proctors, dual-camera monitoring, a three-point identity check, a secure browser and a credibility report for every candidate. It also runs aptitude, psychometric, coding and English tests, so a recruiter can do the whole screening in one place. It says it handles more than 200,000 exams in a day.</p>
<ul class="al-list">
<li><strong>Best for</strong>Recruitment drives, campus hiring, university exams taken at home, certifications.</li>
<li><strong>Watch out for</strong>Its help centre says proctored tests aren’t supported on phones or tablets: candidates need a laptop or desktop with a webcam and a steady 512 kbps.</li>
<li><strong>Price</strong>Not published; quote after a demo. A listing site has shown a starting figure around $2,990 a year, which is third-party.</li>
</ul>

<h3>2. Talview: best for AI proctoring with a human final call</h3>
<p>Talview’s proctoring, which it calls Alvy, matches the candidate’s face continuously, can add a second camera view and a locked browser, and runs in three ways: fully automated, recorded and reviewed later, or live. Instead of a generic “suspicious activity” alert, it says it names the app or device behind each flag, and it is explicit that the decision to disqualify stays with you. It also offers AI interviews and identity checks for hiring, and plugs into Moodle, Canvas and Workday.</p>
<ul class="al-list">
<li><strong>Best for</strong>Certification bodies, universities and high-volume recruiters who want AI proctoring with a clear review trail.</li>
<li><strong>Watch out for</strong>A full enterprise product, sold by demo.</li>
<li><strong>Price</strong>Not published.</li>
</ul>

<h3>3. Eklavvya: best when answers are written, not ticked</h3>
<p>Eklavvya, made in Maharashtra, combines proctoring (face recognition, live monitoring, audio recording, ID checks, and a lockdown browser for centre exams) with something most proctoring tools lack: marking descriptive answers on screen, with AI support and faculty approval. For a university whose semester exams are written, that combination matters more than any single proctoring feature.</p>
<ul class="al-list">
<li><strong>Best for</strong>Universities running proctored exams with descriptive answers.</li>
<li><strong>Watch out for</strong>AI, audio and 360° video proctoring are on the Enterprise plan only.</li>
<li><strong>Price</strong>Per exam credit (one candidate, one exam); 25 credits free, paid plans quoted.</li>
</ul>
`),
                ],
            },
            {
                id: 'lms',
                title: 'Proctoring inside a university LMS',
                tocLabel: 'LMS proctoring',
                kicker: 'Reviews 4–7',
                blocks: [
                    html(`
<p>These tools don’t replace your quiz system. They sit on top of the quizzes you already run in Moodle, Canvas, Blackboard or Brightspace, and add watching. Most are bought by the institution under a yearly contract.</p>

<h3>4. ProctorU (Meazure Learning): best for live human proctors</h3>
<p>ProctorU, part of Meazure Learning, is known for live proctoring: a real person checks the candidate’s ID and room and watches the session. Its Record+ option records the session for review instead. Prices are per exam and set per institution, which also decides whether the institution or the student pays. As one example, Oklahoma State University lists Live+ at $16.80 for an exam of up to 60 minutes and $32.55 for one of four hours, and Record+ at $6.30.</p>
<ul class="al-list">
<li><strong>Best for</strong>Certification and high-stakes university exams where a human witness matters.</li>
<li><strong>Watch out for</strong>Live sessions are booked in advance; late booking can cost more.</li>
<li><strong>Price</strong>Per exam; see the example above.</li>
</ul>

<h3>5. Proctorio: best for automated proctoring at scale</h3>
<p>Proctorio runs as a browser extension inside Chrome, Edge, Brave or Opera on Windows, Mac, Chromebooks and Linux, and the institution chooses the settings exam by exam: record video, verify ID, block downloads, add a live proctor. It says it has proctored more than 300 million exams. Phones are supported only through the Proctorio mobile app, which is a paid add-on. Its stated requirements are modest: a basic 320×240 webcam and a low upload speed, though live proctoring needs 5 Mbps.</p>
<ul class="al-list">
<li><strong>Best for</strong>Universities proctoring many exams through an LMS, mostly automatically.</li>
<li><strong>Watch out for</strong>An extension must be installed on every machine a student uses.</li>
<li><strong>Price</strong>Institution contract. Some universities charge students per exam; Ohio University, for example, lists $3.</li>
</ul>

<h3>6. Honorlock: best for AI with a human who steps in</h3>
<p>Honorlock pairs AI monitoring with live proctors who “pop in” when the AI flags something, rather than a human watching every minute. It lists cell phone detection, blocking of AI tools, ID verification, a second camera and a feature that searches the web for leaked exam questions and has them taken down. It plugs into Canvas, Blackboard, Brightspace and Moodle, and offers 24/7 support.</p>
<ul class="al-list">
<li><strong>Best for</strong>Universities that want a person involved only when something looks wrong.</li>
<li><strong>Watch out for</strong>Built for LMS exams on computers.</li>
<li><strong>Price</strong>Not published.</li>
</ul>

<h3>7. Respondus LockDown Browser and Monitor: best for locking the screen</h3>
<p>Respondus LockDown Browser stops a student copying, printing, opening other apps or websites, and running the exam inside a virtual machine or a screen share, and won’t let them leave until they submit. Respondus says more than 2,000 institutions use it. Respondus Monitor adds webcam proctoring on top, and an annual LockDown Browser licence includes 200 Monitor seats. It works with Blackboard, Brightspace, Canvas, Moodle, Sakai and Schoology. University help pages list Windows, Mac, iPad and Chromebook (with some features missing); Android and iPhone aren’t supported.</p>
<ul class="al-list">
<li><strong>Best for</strong>Lab exams and LMS quizzes on computers and iPads.</li>
<li><strong>Watch out for</strong>No Android. Students install it before the exam.</li>
<li><strong>Price</strong>Annual licence for unlimited use at the institution; a free two-month pilot.</li>
</ul>
`),
                ],
            },
            {
                id: 'light',
                title: 'Lighter and cheaper options',
                tocLabel: 'Lighter options',
                kicker: 'Reviews 8–11',
                blocks: [
                    html(`
<h3>8. AutoProctor: best for adding proctoring to Google Forms</h3>
<p>AutoProctor adds webcam proctoring to tests you already run in Google Forms, Microsoft Forms and other quiz tools, and it publishes its prices in rupees. One standard proctored attempt costs one credit, which is ₹9. Extras cost more credits per attempt: an ID card check or impersonation detection 4 each, pairing a phone as a second camera 4, session recording 4, candidate video 15. The Standard plan is ₹1,350 a month for 150 credits, with quarterly and yearly options, and new accounts get 10 free credits. Tests with only a timer use no credits.</p>
<ul class="al-list">
<li><strong>Best for</strong>Small institutes and recruiters who already use Google Forms and want webcam proctoring without a new platform.</li>
<li><strong>Watch out for</strong>Add-ons multiply the price: every add-on on one attempt is 28 credits. Its pricing page says payment is by card; UPI isn’t accepted.</li>
<li><strong>Price</strong>₹9 per standard attempt; plans from ₹1,350 a month.</li>
</ul>

<h3>9. Safe Exam Browser: best free option for labs</h3>
<p>Safe Exam Browser is free, open-source software that turns a computer into a locked exam machine: no other apps, no other sites. It runs on Windows, macOS and iPad, and Moodle supports it directly. It has no camera, so it is meant for exams where an invigilator is in the room, such as a computer lab. Our <a href="/moodle-alternative">Moodle guide</a> covers setting it up.</p>
<ul class="al-list">
<li><strong>Best for</strong>Colleges running exams in their own labs.</li>
<li><strong>Watch out for</strong>No Android version; every machine needs it installed and configured.</li>
<li><strong>Price</strong>Free.</li>
</ul>

<h3>10. TestoZa: best for weekly tests on students’ phones</h3>
<p>TestoZa is an online test platform for Indian coaching institutes, schools and teachers, and its proctoring is deliberately light. It never switches on the camera or microphone and never records the screen. Instead it sets rules in the browser: the exam asks for full screen and counts each time a candidate leaves it, counts every switch to another tab or app, blocks copy, cut, paste and right-click, and can shuffle questions. You choose a limit, and whether reaching it warns the candidate or submits the paper. On live exams, each seat is open on one device at a time, candidates can check in with roll number and PIN, the clock is the server’s, and the answer key stays on the server until the candidate has submitted. The exam room shows you, live, who has no signal, who has warnings and who changed device.</p>
<p>All of this works in an ordinary phone browser, with no install, which is the point: it reaches the students who only have a phone. On iPhones, which don’t allow web pages to go full screen, the full-screen rule is skipped and the other rules still apply.</p>
<ul class="al-list">
<li><strong>Best for</strong>Weekly tests, chapter tests and mock series for your own students, sat at home on phones.</li>
<li><strong>Watch out for</strong>It can’t see the room. A friend sitting beside the student, or a second phone on the desk, isn’t caught. No ID checks.</li>
<li><strong>Price</strong>Basic rules are free; the stricter rules are on paid plans: ₹49 for 7 days, ₹149 for 30 days, ₹799 a year. See <a href="/pricing">pricing</a>.</li>
</ul>

<h3>11. Google Forms locked mode: best for school Chromebooks</h3>
<p>Google Forms has a locked mode that keeps students inside the quiz until they submit. It only works on Chromebooks managed by the school, so it is useful for schools that hand out Chromebooks and of no use on students’ own phones.</p>
<ul class="al-list">
<li><strong>Best for</strong>Schools with managed Chromebooks.</li>
<li><strong>Watch out for</strong>No timer or negative marking built in.</li>
<li><strong>Price</strong>Free with Google Workspace for Education.</li>
</ul>
`),
                ],
            },
            {
                id: 'privacy',
                title: 'Privacy, children and false flags',
                tocLabel: 'Privacy and flags',
                kicker: 'Before you switch it on',
                blocks: [
                    html(`
<p>Webcam proctoring records a candidate’s face, voice, room and often their ID. Three things are worth thinking through before you switch it on.</p>
<h3>Many of your candidates are children</h3>
<p>India’s Digital Personal Data Protection Act, 2023 treats anyone under 18 as a child. It requires verifiable consent from a parent before processing a child’s personal data and bars tracking and behavioural monitoring of children. The DPDP Rules, notified in November 2025, phase most duties in over 18 months and give educational institutions a limited exemption for educational activities and children’s safety. Whether that exemption covers webcam proctoring by your institute is a question for a lawyer, not a software vendor. What is certain is that the less you record, the less you have to protect.</p>
<h3>AI flags are not proof</h3>
<p>Proctoring AI flags a look away from the screen, a voice, a second face or poor light. Most flags are innocent: a younger brother walking past, a student reading a question aloud, a dim room. The better vendors say so. Talview states that the final call stays with you, and Honorlock brings in a human when its AI flags something. Plan the review time: someone has to look at every flag before it becomes a decision.</p>
<h3>Cheating moves, it doesn’t stop</h3>
<p>Every control closes one route. Locked browsers stop other tabs, but not a second phone. A webcam sees the second phone, but not a message through an earphone. Leaked questions beat all of them, which is why Honorlock searches the web for its customers’ questions. Our guide to <a href="/prevent-cheating-in-online-exams">preventing cheating in online exams</a> sets out which control stops which method, including the ones no software stops, such as a fresh question paper for each sitting.</p>
`),
                ],
            },
            {
                id: 'pilot',
                title: 'How to choose: pilot before exam day, and when TestoZa is the wrong pick',
                tocLabel: 'Pilot and limits',
                kicker: 'Before you decide',
                blocks: [
                    html(`
<p>A vendor demo shows the product working on a good laptop in an office. Your exam will run on your candidates’ devices, in their homes. Run this pilot with ten real people first:</p>
${stepsFallback(P)}
<h3>When TestoZa is the wrong pick</h3>
<p>We would rather you chose the right proctoring than ours. TestoZa is not enough if you need:</p>
<ul class="al-limits">
<li><strong>Proof of who sat the exam.</strong> There is no face match or ID check. For hiring and licences, use Mercer Mettl, Talview or ProctorU.</li>
<li><strong>Eyes on the room.</strong> No webcam, microphone or second camera. If a friend beside the student would change the result, use a webcam suite or hold the exam in a centre.</li>
<li><strong>A locked computer.</strong> TestoZa’s rules are counted and acted on, but the browser itself isn’t locked. For lab exams, use Safe Exam Browser or Respondus.</li>
<li><strong>Proctoring inside your LMS.</strong> TestoZa doesn’t plug into Moodle or Canvas.</li>
</ul>
<p>And if the job is weekly tests and mocks for your own students, on whatever phone they have, light rules are usually the right amount. See <a href="/how-to-conduct-online-exam">how to conduct an online exam</a> and <a href="/mobile-friendly-online-exam">how a phone exam handles calls and dropped signal</a>.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'What is the best proctoring software?',
                a: 'It depends on the stakes and the device. For hiring and certification on laptops, Mercer Mettl, Talview or ProctorU. For university exams inside an LMS, Proctorio, Honorlock or Respondus Monitor. For lab exams, Safe Exam Browser (free) or Respondus LockDown Browser. For Google Forms tests, AutoProctor. For weekly tests on students’ phones, TestoZa’s browser rules.',
            },
            {
                q: 'Which proctoring software works on mobile phones?',
                a: 'Few camera-based tools do. Mettl’s help centre says its proctored tests aren’t supported on phones or tablets, Respondus has no Android version, and Proctorio supports phones only through a paid mobile add-on. Talview offers candidate apps. TestoZa runs its rules in any phone browser with no install, but uses no camera.',
            },
            {
                q: 'Is there free proctoring software?',
                a: 'Safe Exam Browser is free and open source, for Windows, macOS and iPad, but has no camera. Google Forms locked mode is free on school-managed Chromebooks. TestoZa’s basic exam rules are free, with stricter rules from ₹49 for 7 days. AutoProctor gives 10 free proctored attempts.',
            },
            {
                q: 'How much does online proctoring cost?',
                a: 'AutoProctor publishes ₹9 per standard proctored attempt, more with add-ons. University price lists show ProctorU’s live proctoring at about $17 to $33 per exam and recorded proctoring at about $6. Proctorio, Honorlock, Respondus, Mettl and Talview sell institution contracts by quote. TestoZa charges for time: ₹799 a year, not per candidate.',
            },
            {
                q: 'Can proctoring software detect a phone or a second person?',
                a: 'Webcam proctoring can, if the phone or person is in view: Honorlock lists cell phone detection, and Mettl and Talview offer a second camera. Browser-only rules, such as Safe Exam Browser or TestoZa’s, can’t see the room, so they don’t catch a phone on the desk or a helper beside the candidate.',
            },
            {
                q: 'Is AI proctoring accurate?',
                a: 'It is good at flagging, not at judging. AI flags look-aways, voices, extra faces and poor light, and many flags are innocent. Vendors such as Talview say the final decision stays with a human, and Honorlock brings in a live proctor when its AI flags something. Plan time for someone to review flags.',
            },
            {
                q: 'Is webcam proctoring legal for students under 18 in India?',
                a: 'The DPDP Act 2023 requires verifiable parental consent for processing children’s data and bars behavioural monitoring of children, with a limited exemption in the 2025 Rules for educational institutions’ educational activities and safety. Whether that covers your proctoring is a legal question; ask a lawyer before recording minors.',
            },
            {
                q: 'Does TestoZa have webcam proctoring?',
                a: 'No. TestoZa never uses the camera, microphone or screen recording. It uses browser rules: full screen, counted tab and app switches with a limit that can submit the paper, copy and paste off, question shuffle, one device per seat, roll number and PIN check-in, and a live exam room for the teacher.',
            },
            {
                q: 'Is this comparison biased because TestoZa wrote it?',
                a: 'We make TestoZa, so read it with that in mind. Every other tool is described from its own website and help pages, or from universities that use it, checked in November 2026. TestoZa is listed in the lightest category, and the guide names four cases where you need something heavier.',
            },
        ],

        closingTitle: 'Match the proctoring to the stakes.',
        closing: [
            html(`
<p>If your exam is a weekly test or a mock for your own students, try TestoZa’s exam rules on one paper:</p>
<div class="al-paths">
<a class="al-path" href="/create-test" data-icon="pencil"><span class="al-path-who">Building a test?</span><span class="al-path-what">Switch on full screen and tab-switch limits</span></a>
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Paper already written?</span><span class="al-path-what">Upload the PDF and let the AI read it</span></a>
<a class="al-path" href="/user-guide/live-exam-sessions" data-icon="key"><span class="al-path-who">Running it live?</span><span class="al-path-what">See how the exam room works</span></a>
</div>
<p>Related reading: <a href="/prevent-cheating-in-online-exams">preventing cheating in online exams</a>, <a href="/mercer-mettl-alternative">Mettl alternative</a>, <a href="/best-online-exam-software-india">best online exam software in India</a>, <a href="/online-proctoring-software">TestoZa’s exam rules</a> and <a href="/guides">all guides</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Mercer | Mettl',
                links: [
                    { label: 'Online proctoring', href: 'https://mettl.com/en/online-remote-proctoring/' },
                    { label: 'System requirements', href: 'https://support.mettl.com/portal/en/kb/articles/system-requirement-for-mettl-assessment-platform' },
                ],
            },
            {
                label: 'Talview and Eklavvya',
                links: [
                    { label: 'Talview', href: 'https://www.talview.com/' },
                    { label: 'Eklavvya pricing', href: 'https://www.eklavvya.com/pricing/' },
                ],
            },
            {
                label: 'Proctorio and Honorlock',
                links: [
                    { label: 'Proctorio requirements', href: 'https://proctorio.com/requirements' },
                    { label: 'Proctorio at Ohio University (student price)', href: 'https://help.ohio.edu/TDClient/30/Portal/KB/Article/91/Getting-Started-with-Proctorio-Students' },
                    { label: 'Honorlock', href: 'https://honorlock.com/' },
                ],
            },
            {
                label: 'Respondus',
                links: [
                    { label: 'LockDown Browser', href: 'https://web.respondus.com/he/lockdownbrowser/' },
                    { label: 'Supported devices (Vanderbilt help)', href: 'https://vanderbilt.edu/brightspace/?p=7784' },
                ],
            },
            {
                label: 'ProctorU / Meazure Learning',
                links: [{ label: 'Oklahoma State: proctored exam prices', href: 'https://business.okstate.edu/online/proctored-exams' }],
            },
            {
                label: 'AutoProctor and Safe Exam Browser',
                links: [
                    { label: 'AutoProctor pricing', href: 'https://www.autoproctor.co/pricing' },
                    { label: 'Safe Exam Browser', href: 'https://safeexambrowser.org/' },
                    { label: 'Safe Exam Browser in Moodle', href: 'https://docs.moodle.org/en/Safe_Exam_Browser' },
                ],
            },
            {
                label: 'Google Forms',
                links: [{ label: 'Use locked mode for quizzes', href: 'https://support.google.com/docs/answer/7634943' }],
            },
            {
                label: 'Children’s data in India',
                links: [
                    { label: 'DPDP Rules, Rule 12 (children)', href: 'https://dpdpa.com/dpdparules/rule12.html' },
                    { label: 'Statcounter, mobile operating systems in India', href: 'https://gs.statcounter.com/os-market-share/mobile/india' },
                ],
            },
            {
                label: 'TestoZa',
                links: [
                    { label: 'Pricing', href: 'https://testoza.com/pricing' },
                    { label: 'Live exam sessions', href: 'https://testoza.com/user-guide/live-exam-sessions' },
                ],
            },
        ],
    },
};
