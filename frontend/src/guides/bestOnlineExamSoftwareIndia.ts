/**
 * testoza.com/best-online-exam-software-india — thirteen online exam platforms used in
 * India, sorted by what the exam decides (a class check, weekly tests and mocks, or a
 * hiring / degree / licence exam), checked against eight things an Indian paper needs,
 * with what a year costs at a real batch size. Written for coaching institute owners,
 * school exam cells, college exam coordinators and the teacher choosing for one batch.
 *
 * Not the same page as /best-online-test-platform (what any test platform has to do, for
 * teachers, institutes and students). This one is the comparison list for India.
 *
 * Facts and where they come from (sources in `sources`):
 *   - Mercer Mettl, Classplus, Teachmint, SpeedExam, ProProfs, Testportal, Moodle,
 *     Canvas, Socrative, Kahoot: as checked for the alternative guides, 2–15 October 2026
 *     (see the headers of mettlAlternative.ts, classplusAlternative.ts and friends).
 *   - Re-checked 25 October 2026: SpeedExam pricing (Free $0, 25 attempts a month;
 *     Professional $240 a year or $37 billed monthly, 500 attempts; Ultimate $1,500 a year
 *     or $180 billed monthly, 3,500 attempts; "Includes incomplete and retake attempts");
 *     ProProfs pricing (Free 8 quiz questions + 4 lead fields; Essentials $19.99 per 100
 *     active quiz takers a month, max 300; Business $39.99 per 100, max 500).
 *   - Eklavvya (eklavvya.com, 25 October 2026): Splashgain Technology Solutions,
 *     Maharashtra; "enterprise-grade AI-powered examination and assessment platform";
 *     entrance, semester and PhD evaluations, recruitment and certification; facial
 *     recognition, live monitoring, audio recording, identity verification, lockdown
 *     browser for centre exams; AI marks typed descriptive answers against model answers,
 *     OCR for handwritten sheets, faculty approve or override; question papers in English,
 *     Hindi, Marathi, Tamil and 30+ languages; "500+ Clients", "50M+ Assessments" (vendor
 *     figures). Pricing page: per exam credit ("one candidate attempting one exam"),
 *     annual, free for 25 credits; Professional and Enterprise quoted; AI video, audio and
 *     360° proctoring on Enterprise only.
 *   - TCS iON (tcsion.com, 25 October 2026): Digital Exams ("digitisation and automation
 *     of the exam processes"), Digital Marking of subjective answer scripts, Digital
 *     Assessments; segments Government, Higher Education, School and Skill Education; the
 *     National Qualifier Test; no prices, "Learn More" only. iON Digital Zones are its
 *     test centres (centre lists and candidates' admit cards). No volume figures are
 *     quoted, because the site gives none.
 *   - Testpress (testpress.tech, 25 October 2026): Chennai; "Trusted by 1000+
 *     Institutes"; online tests with objective and subjective questions, webcam-proctored
 *     timed exams, grading and analytics; DRM video hosting, live classes, course selling,
 *     integrated payments; no prices on the home page. Negative marking, sections and
 *     rank lists are not described there, so the page says so instead of guessing.
 *   - Google Forms, Microsoft Forms, Wayground, ClassMarker: as in bestOnlineTestPlatform.ts.
 *   - Statcounter, India, September 2026: Android 93.89% of mobile (moodleAlternative.ts).
 *
 * TestoZa claims: the set verified for the Moodle and Mettl guides (join codes, 20-second
 * saves, rejoin on another device, Marks and Wrong per question, proportional or JEE
 * Advanced partial marks, numerical ranges, timed sections, Hindi, AI import from PDFs and
 * photos, rank list, report cards, parent WhatsApp notes, exam rules on paid plans,
 * ₹49 / ₹149 / ₹799). Not in the product, and never to be implied: camera, microphone or
 * screen proctoring, identity checks, a lockdown browser, essays or file uploads, a branded
 * app, course selling, fees, LMS integration, certificates, psychometric or coding tests.
 */
import { HOWTO_PAGES } from './howtoData';
import { compareFallback, scenariosFallback, stepsFallback } from './howtoFallback';
import { BEST_EXAM_INDIA_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const P = HOWTO_PAGES.bestIndia;

export const BEST_ONLINE_EXAM_SOFTWARE_INDIA: Guide = {
    meta: BEST_EXAM_INDIA_META,
    body: {
        intro: [
            html(`
<p>Search for the best online exam software in India and you get lists of ten names, each one “the best”. Read them closely and they are ranking three different kinds of product in one column: tools for a quick quiz in class, platforms for a coaching institute’s weekly tests and mock series, and enterprise suites that watch candidates through a webcam during a recruitment or university exam. Putting all three in one ranking is like ranking a scooter against a bus. Both are good. They do different jobs.</p>
<p>So this guide sorts by the job first. It covers thirteen platforms that Indian institutes actually shortlist, puts each one where it belongs, and checks it against eight things an Indian paper needs: phones, negative marking, partial credit, sections with their own clock, Hindi, getting questions in, proctoring and price. Then it works out what a year costs for a real institute, because the price meter matters more than the price.</p>
<p>One thing to say up front: we make <a href="/">TestoZa</a>, which is on this list. That is why every other entry is described only from its own website, pricing page and help centre, why prices that appear only on listing sites are labelled as such, and why the last section lists the cases where TestoZa is the wrong pick.</p>
`),
        ],

        answer:
            'The best online exam software in India depends on what the exam decides. For weekly tests and mock series for your own students, pick a platform that runs on any phone without an app, marks +4/−1 with partial credit and numerical answers, and publishes its price. TestoZa does all of that: building and running tests is free, and paid plans are ₹49 for 7 days, ₹149 for 30 days or ₹799 a year. For proctored hiring, university or certification exams, use an enterprise suite such as Mercer Mettl or Eklavvya, and for national-scale exams in test centres, TCS iON. If you want your own branded app for video courses, look at Classplus or Testpress. For a quick quiz in class, Google Forms or Kahoot is enough.',

        sections: [
            {
                id: 'at-a-glance',
                title: 'The shortlist at a glance',
                tocLabel: 'At a glance',
                kicker: 'The list',
                blocks: [
                    html(`
<p>Thirteen platforms, each with the one job it does best. The numbers match the reviews below, which are grouped by the kind of exam. They are not scores.</p>
<div class="al-table-wrap al-table-wrap--wide"><table class="al-table">
<thead><tr><th scope="col">Platform</th><th scope="col">Best for</th><th scope="col">Students sit it on</th><th scope="col">Price</th></tr></thead>
<tbody>
<tr><th scope="row" class="al-us">1. TestoZa</th><td data-label="Best for" class="al-us">Weekly tests and mock series for your own students</td><td data-label="Students sit it on" class="al-us">Any phone browser, no app</td><td data-label="Price" class="al-us">Free to build and run; ₹49 / 7 days, ₹149 / 30 days, ₹799 / year</td></tr>
<tr><th scope="row">2. Classplus</th><td data-label="Best for">A branded coaching app with courses and fees</td><td data-label="Students sit it on">Your institute’s own app</td><td data-label="Price">Quote after a demo</td></tr>
<tr><th scope="row">3. Testpress</th><td data-label="Best for">Institutes selling video courses, with tests alongside</td><td data-label="Students sit it on">Its platform; tests can be webcam-proctored</td><td data-label="Price">Not on its home page</td></tr>
<tr><th scope="row">4. Teachmint</th><td data-label="Best for">Schools fitting out classrooms</td><td data-label="Students sit it on">Classroom panels, clickers and its platform</td><td data-label="Price">Quote after a demo</td></tr>
<tr><th scope="row">5. Moodle</th><td data-label="Best for">Colleges with an IT team and a course system</td><td data-label="Students sit it on">Browser or the Moodle app</td><td data-label="Price">Free software; you pay for hosting</td></tr>
<tr><th scope="row">6. SpeedExam</th><td data-label="Best for">Certificates and proctoring on a monthly attempt allowance</td><td data-label="Students sit it on">Browser, phone or tablet</td><td data-label="Price">Free for 25 attempts a month; $240 or $1,500 a year</td></tr>
<tr><th scope="row">7. Mercer Mettl</th><td data-label="Best for">Proctored hiring, university and certification exams</td><td data-label="Students sit it on">Laptop or desktop with a webcam, for proctored tests</td><td data-label="Price">Quote after a demo</td></tr>
<tr><th scope="row">8. Eklavvya</th><td data-label="Best for">University exams with descriptive answers</td><td data-label="Students sit it on">Remote with proctoring, or at an exam centre</td><td data-label="Price">25 exam credits free; paid plans quoted</td></tr>
<tr><th scope="row">9. TCS iON</th><td data-label="Best for">Large exams run by exam bodies and recruiters</td><td data-label="Students sit it on">Exam centres, including iON Digital Zones</td><td data-label="Price">By enquiry</td></tr>
<tr><th scope="row">10. ProProfs Quiz Maker</th><td data-label="Best for">Quizzes for a small or global audience</td><td data-label="Students sit it on">Browser</td><td data-label="Price">From $19.99 per 100 active quiz takers a month</td></tr>
<tr><th scope="row">11. Testportal</th><td data-label="Best for">Business training and certification</td><td data-label="Students sit it on">Browser</td><td data-label="Price">Metered by test results a month</td></tr>
<tr><th scope="row">12. Google Forms</th><td data-label="Best for">A short recap that doesn’t count</td><td data-label="Students sit it on">Any browser</td><td data-label="Price">Free</td></tr>
<tr><th scope="row">13. Kahoot, Wayground, Socrative</th><td data-label="Best for">Live quizzes in the room</td><td data-label="Students sit it on">Any device, in class</td><td data-label="Price">Free tiers with caps per game or room</td></tr>
</tbody>
</table></div>
<p class="al-note">Prices in US dollars are as published by each company and change often. “Quote after a demo” means the product’s own website shows no price. Listing sites sometimes print one, and we mention those figures only where they help, labelled as third-party.</p>
`),
                ],
            },
            {
                id: 'which-one',
                title: 'Which one fits you: six common situations',
                tocLabel: 'Which one fits you',
                kicker: 'Your situation',
                blocks: [
                    html(`
<p>If you only read one part of this page, read the card for your situation. Each one says what matters most, which platforms belong on your shortlist, and the first thing to try.</p>
`),
                    { type: 'widget', widget: 'hw-scenarios', fallbackHtml: scenariosFallback(P) },
                    html(`
<p>Notice that for hiring, and for a quick check in class, the answer isn’t TestoZa. That is deliberate. A recruitment test and a quiz game in class are different jobs, and pretending one tool does every job is how most “best software” lists go wrong.</p>
`),
                ],
            },
            {
                id: 'how-we-compared',
                title: 'How we compared them: eight checks for an Indian exam',
                tocLabel: 'How we compared',
                kicker: 'Method',
                blocks: [
                    html(`
<p>Feature lists are long and mostly the same. These eight checks are the ones that decide whether an online exam works for Indian students and Indian papers. Each review below comes back to them.</p>
<ol class="al-list al-list--num">
<li><strong>It runs on the phone a student already owns.</strong>Most students in India have a phone, not a laptop, and Statcounter puts Android at 93.9% of Indian mobile phones. A test that needs a laptop, a webcam or an app to install decides who can sit it before the paper does.</li>
<li><strong>It marks like the real paper.</strong>Negative marks to the decimal (−1 for JEE Main and NEET, −0.5 for SSC, −0.25 for bank exams), partial credit on questions with more than one correct answer, and numerical answers within a range. If the software can’t, someone fixes scores in a spreadsheet afterwards.</li>
<li><strong>Sections can run on their own clock.</strong>SSC Tier 1 and the bank prelims now time each section separately and close it when the time is up. A mock that lets students move time between sections teaches them the wrong habit.</li>
<li><strong>It works in Hindi, or in both languages.</strong>Many state and central exams are bilingual. Typing Hindi should not need a special font or keyboard.</li>
<li><strong>Getting questions in is quick.</strong>Typing ninety questions by hand is where most online tests die. Good software reads the PDF or the photo of a printed page you already have.</li>
<li><strong>Proctoring matches the stakes.</strong>A recruitment test needs a webcam and an ID check. A weekly practice test needs rules that stop the easy cheating without asking a family for a private room.</li>
<li><strong>Results are useful the same evening.</strong>A rank list, section-wise and topic-wise results, report cards and a way to tell parents, not just a score per student.</li>
<li><strong>The price is findable and the meter fits your volume.</strong>Is there a price on the website? Does it count candidates, attempts, retakes or time? A meter that is fair for one hiring drive can be expensive for a weekly test.</li>
</ol>
<p>How we checked: we read each product’s own website, pricing page and help centre between 2 and 25 October 2026, and for TestoZa we checked the product itself. We did not sign enterprise contracts or sit vendor demos, so anything a company only tells you on a sales call is not here. Where a check isn’t described on a product’s public pages, we say “not described” rather than “no”.</p>
`),
                ],
            },
            {
                id: 'two-kinds',
                title: 'Two kinds of exam software, and why the lists mix them up',
                tocLabel: 'Two kinds',
                kicker: 'The big split',
                blocks: [
                    html(`
<p>Most of the confusion comes from one split. On one side are <strong>enterprise exam suites</strong>: Mercer Mettl, Eklavvya, TCS iON and, at a smaller scale, SpeedExam. They are built for sittings that decide something about a stranger, such as a job, a degree or a licence. On the other side are <strong>self-serve exam platforms</strong> for teachers testing their own students every week. Both are “online exam software”. They are bought differently, sat on different devices and priced on different meters.</p>
`),
                    { type: 'widget', widget: 'hw-compare', fallbackHtml: compareFallback(P) },
                    html(`
<p>Neither kind is better. An institute that runs a university entrance test and a weekly practice series may need both, and many do. What goes wrong is buying the heavy kind for the light job, or the light kind for the heavy one.</p>
`),
                ],
            },
            {
                id: 'everyday',
                title: 'For your own students: weekly tests, mocks and course quizzes',
                tocLabel: 'Everyday testing',
                kicker: 'Reviews 1–5',
                blocks: [
                    html(`
<p>These are the platforms for the most common job in Indian education: testing your own students, often, on the paper pattern of the exam they are preparing for. Coaching institutes and schools mostly start with the first four; colleges that already run a course system, with the fifth.</p>

<h3>1. TestoZa: best for weekly tests and mocks on students’ phones</h3>
<p>TestoZa is an online exam platform built for Indian coaching institutes, schools and teachers. It starts from the device most students actually have: a budget Android phone on mobile data. Candidates open <a href="/join">testoza.com/join</a> in the phone’s browser, type a six-digit code and their name or roll number, and start. There is no app and no account. Answers are saved to the server every 20 seconds, and a candidate whose phone dies can rejoin on another device and carry on with the same answers and the time left.</p>
<p>The paper itself follows Indian patterns. Every question has a Marks and a Wrong field, so +4/−1 is two numbers and −0.25 or −0.33 works the same way. Multiple-correct questions take partial marks, either proportional or the exact JEE Advanced rule. Numerical answers are accepted within a range you set. Sections can close on their own clock, as SSC and bank papers now do, and the exam screen has the NTA-style four-colour question palette with Mark for review. Papers can be in Hindi or both languages. To get questions in, you upload last year’s paper as a PDF or photograph a printed or handwritten page, and the AI reads the questions, options, answer key, equations and diagrams into the builder for you to check.</p>
<p>After the paper you get a rank list, section-wise and topic-wise results, report cards you can print, an Excel export, and a ready-written WhatsApp note for each parent (you send it; nothing goes out on its own). During the exam, the exam room shows who is writing, who left the screen and who changed device, and you can give one candidate or everyone more time.</p>
<ul class="al-list">
<li><strong>Best for</strong>Coaching institutes and schools running weekly tests and full-length mocks for JEE, NEET, SSC, bank exams, CUET and boards; students practising on their own.</li>
<li><strong>Watch out for</strong>No webcam or microphone proctoring, no identity checks, no essays or file uploads, no branded app and no course selling. Exam rules such as forced full screen and tab-switch limits are on the paid plans.</li>
<li><strong>Price</strong>Building tests, live exams, marking and results are free. Paid plans: ₹49 for 7 days, ₹149 for 30 days, ₹799 a year, with no per-candidate charge. See <a href="/pricing">pricing</a>.</li>
</ul>

<h3>2. Classplus: best if you want your own coaching app</h3>
<p>Classplus sells coaching institutes a branded app (its own tagline is “Aapki Coaching Aapki App”) with live lectures, recorded content, online tests with automatic checking, attendance and fee collection, published under your institute’s name on the Play Store. If what you really want is an app business, with courses to sell and fees to collect, that is what Classplus is built for.</p>
<p>The tests are one module of that app. Review sites describe the testing side as basic next to dedicated exam software, with no item analysis or adaptive testing, and its public pages don’t say how negative marks, partial credit or sectional timing are set. Everything, tests included, is built around your institute’s own app. Our <a href="/classplus-alternative">Classplus alternative guide</a> covers the common split: keep the app for courses and fees, and run the exams somewhere built for them.</p>
<ul class="al-list">
<li><strong>Best for</strong>Institutes that want a branded app for video courses, live classes and fee collection, with tests included.</li>
<li><strong>Watch out for</strong>Tests are the lighter half; check your paper’s marking in the demo, and ask how students reach a test without the app.</li>
<li><strong>Price</strong>No price on its website, only a demo request. Reseller and listing sites quote between about ₹8,000 and ₹50,000 a year, some with a setup fee and a commission on course sales. They disagree with each other, so treat them as third-party guesses.</li>
</ul>

<h3>3. Testpress: best for institutes that sell video courses</h3>
<p>Testpress, based in Chennai, says it is trusted by more than 1,000 institutes. It combines an online test platform with secure video hosting (DRM encryption and protection against screen recording), live classes with Zoom, course selling and integrated payments. Its tests take both objective and subjective questions, can be timed and proctored by webcam, and come with grading and analytics.</p>
<p>Its home page doesn’t describe negative marking, sections with their own clock or rank lists. That doesn’t mean it lacks them. It means you should test them in the demo with your own paper.</p>
<ul class="al-list">
<li><strong>Best for</strong>Institutes whose business is recorded video courses, who want tests and payments in the same place.</li>
<li><strong>Watch out for</strong>Indian marking details aren’t on its public pages. Ask about phones and app installs for your students.</li>
<li><strong>Price</strong>Not published on its home page.</li>
</ul>

<h3>4. Teachmint: best for schools fitting out classrooms</h3>
<p>Teachmint began as a mobile teaching app and now leads with connected-classroom hardware. Its home page opens with Teachmint X, an interactive flat panel in 65, 75 and 86 inch sizes, along with Vision X for device and campus management and Click X student clickers. Around the hardware sits a platform that automates attendance, grading and progress reports, and EduAI, which generates quizzes and homework.</p>
<p>For a school buying panels for every classroom, having one platform with them makes sense. For a coaching institute whose students sit tests at home on their phones, it is a lot of product around a small need. More in our <a href="/teachmint-alternative">Teachmint alternative guide</a>.</p>
<ul class="al-list">
<li><strong>Best for</strong>Schools equipping classrooms with smart panels that want attendance, grading and reports on the same system.</li>
<li><strong>Watch out for</strong>The hardware leads the sale. Exam-pattern marking and mocks taken at home on phones are not what it is built around.</li>
<li><strong>Price</strong>No price on the site: “Book a Demo”, with an order link for the hardware.</li>
</ul>

<h3>5. Moodle: best for colleges that already run it</h3>
<p>Moodle is the open-source course system behind more than 147,000 registered sites, about 4,500 of them in India. Its quiz module is powerful, with timed quizzes, large question banks and grading by percentage. If your college already runs Moodle for courses, using its quizzes is the obvious choice.</p>
<p>Running it is the catch. Moodle’s own installation guide is written for administrators experienced with web servers, it needs a scheduled task every minute, and every upgrade is yours. Negative marking is possible, set as a negative percentage on each wrong option, but for single-answer questions it only works with the Deferred feedback setting, and a multiple-answer question never goes below zero. Safe Exam Browser, the usual lockdown tool, has no Android version. Our <a href="/moodle-alternative">Moodle alternative guide</a> goes through it in detail.</p>
<ul class="al-list">
<li><strong>Best for</strong>Colleges and universities with an IT team and courses already on Moodle.</li>
<li><strong>Watch out for</strong>Hosting, updates and the plugin set are your job. A simple “−1 per wrong answer” takes some setting up.</li>
<li><strong>Price</strong>The software is free. Hosting costs money and someone’s time; MoodleCloud sells hosted plans without plugins.</li>
</ul>
`),
                ],
            },
            {
                id: 'high-stakes',
                title: 'For exams that decide a job, a degree or a licence',
                tocLabel: 'High-stakes exams',
                kicker: 'Reviews 6–9',
                blocks: [
                    html(`
<p>Here the candidate is usually a stranger with a strong reason to cheat, the result decides something expensive, and the organisation needs proof of who sat the paper. Proctoring, identity checks and an audit trail stop being extras and become the product.</p>

<h3>6. SpeedExam: best for certificates on a monthly allowance</h3>
<p>SpeedExam is an online exam service with offices in India and the United States and, by its own count, more than 15,000 customers in 128 countries. It offers negative marking, sections, ten question types including essays and audio or video questions, certificates with a certificate maker, and proctoring from image capture up to AI audio and video. It says it is mobile and tablet friendly, and it lists GDPR, ISO 27001 and SOC 2 compliance.</p>
<p>Two design choices matter for an institute. Candidates sign in with accounts the administrator manages, rather than joining with a code. And plans are metered by exam attempts a month, which, in SpeedExam’s own words, include incomplete and retake attempts. Our <a href="/speedexam-alternative">SpeedExam alternative guide</a> does the sums.</p>
<ul class="al-list">
<li><strong>Best for</strong>Training providers, colleges and companies that issue certificates and want proctoring, with a published price.</li>
<li><strong>Watch out for</strong>Retakes and unfinished attempts use up the monthly allowance. Logins have to be created and handed out.</li>
<li><strong>Price</strong>Free for 25 attempts a month. Professional, 500 attempts a month: $240 a year, or $37 a month billed monthly. Ultimate, 3,500 attempts: $1,500 a year, or $180 a month billed monthly.</li>
</ul>

<h3>7. Mercer Mettl: best for proctored hiring, university and certification exams</h3>
<p>Mercer Mettl is one of the best-known names in Indian hiring assessments, and many universities use it too. It runs psychometric, aptitude, coding and English tests, an examination platform with 26+ question formats and an equation editor, and some of the strongest proctoring around: AI flags from the webcam and microphone, live human proctors, dual-camera monitoring, three-point identity checks, a secure browser and a credibility report for every candidate. It says it handles more than 200,000 exams in a day. On marking it is closer to an Indian exam platform than you might expect: tests have Correct Marks and Incorrect Marks fields, and sections can have their own time.</p>
<p>The limit is the device. Mettl’s own help centre says its proctored assessments are not supported on mobile devices, phones or tablets. They need a laptop or desktop with a webcam and a steady 512 kbps. For a recruitment drive that is reasonable. For a batch of 120 students who mostly own phones, most of them can’t sit it at home. More in our <a href="/mercer-mettl-alternative">Mettl alternative guide</a>.</p>
<ul class="al-list">
<li><strong>Best for</strong>Recruitment, campus hiring, university semester exams taken at home, and certifications that need proof of identity.</li>
<li><strong>Watch out for</strong>Proctored tests need a laptop or desktop with a webcam. It is sold by demo and quote, priced for organisations.</li>
<li><strong>Price</strong>No price on its website. Software listing sites have shown a starting figure around $2,990 a year as a flat rate; that is a third-party number, not a quote.</li>
</ul>

<h3>8. Eklavvya: best for university exams with descriptive answers</h3>
<p>Eklavvya, made by Splashgain in Maharashtra, calls itself an enterprise-grade, AI-powered examination platform for universities and companies: entrance tests, semester exams, PhD evaluations, recruitment screening and certification. Its proctoring covers facial recognition, live monitoring, audio recording, identity checks and a lockdown browser for exams held in centres.</p>
<p>What sets it apart in India is descriptive answers. Typed answers can be marked by AI against model answers, and handwritten answer sheets are scanned and read by OCR, with faculty approving or overriding each score. Eklavvya says its AI marks 75 to 80% of sheets once it has learned from samples marked by faculty; that is the company’s own figure. Question papers can be generated in English, Hindi, Marathi, Tamil and more than 30 other languages. The pages we checked don’t describe negative marking.</p>
<ul class="al-list">
<li><strong>Best for</strong>Universities and colleges with written, descriptive exams that need marking at scale, plus proctored online sittings.</li>
<li><strong>Watch out for</strong>AI, audio and 360° video proctoring are on the Enterprise plan only. Check objective-paper marking in the demo.</li>
<li><strong>Price</strong>Priced per exam credit, where one credit is one candidate sitting one exam, on an annual plan. Free for 25 credits; Professional and Enterprise are quoted.</li>
</ul>

<h3>9. TCS iON: best for exam bodies running exams at national scale</h3>
<p>TCS iON is the education and assessment business of Tata Consultancy Services. Its site lists Digital Exams, which automate the exam process for an institution, Digital Marking for evaluating handwritten answer scripts on screen, and digital assessments, for government bodies, universities, schools and skills programmes. It also runs the TCS iON National Qualifier Test for job seekers, and candidates for many recruitment tests sit them at its iON Digital Zone test centres.</p>
<p>This is a service for an exam body, not a tool a teacher signs up for on a Tuesday evening. Its site shows no self-serve plan or published price for running your own tests; the assessment pages lead to an enquiry.</p>
<ul class="al-list">
<li><strong>Best for</strong>Recruitment boards, universities and large organisations running computer-based exams for thousands of candidates in centres.</li>
<li><strong>Watch out for</strong>Not built for a single coaching institute’s weekly test, and there’s no way to try it yourself first.</li>
<li><strong>Price</strong>By enquiry.</li>
</ul>
<p>If you are choosing between the four in this section, the question is less about features and more about the sitting. Will candidates write at home or in a centre? Are answers objective or written? Does a stranger need to prove who they are? Answer those three and the shortlist mostly picks itself. Our guide to <a href="/prevent-cheating-in-online-exams">preventing cheating in online exams</a> sets out which control stops which kind of cheating.</p>
`),
                ],
            },
            {
                id: 'other-tools',
                title: 'Global quiz tools and free classroom apps',
                tocLabel: 'Global and free tools',
                kicker: 'Reviews 10–13',
                blocks: [
                    html(`
<p>These four come up in every list, usually because they are well made and well known worldwide. They were mostly not designed around Indian papers, which is fine for some jobs and a problem for others.</p>

<h3>10. ProProfs Quiz Maker: best for small or global quizzes</h3>
<p>ProProfs is a polished, mature quiz maker. It does more than people expect: negative marking, partial and custom grading, multi-section quizzes with each section scored and timed, 20+ question types, 70+ languages, certificates, and proctoring options from tab-switch blocking to webcam and screen sharing. Its catch for India is the meter. Paid plans are priced per 100 active quiz takers a month, in US dollars, with a maximum per plan, and the free plan allows only 8 quiz questions per quiz. Our <a href="/proprofs-alternative">ProProfs alternative guide</a> works the meter through at real batch sizes.</p>
<ul class="al-list">
<li><strong>Best for</strong>Trainers and teachers with small groups, or an audience outside India, who want a rich quiz maker.</li>
<li><strong>Watch out for</strong>Cost rises with every student; a 90-question mock won’t fit on the free plan.</li>
<li><strong>Price</strong>Essentials $19.99 per 100 active quiz takers a month (up to 300); Business $39.99 per 100 (up to 500); K-12 Teacher $4 a month for up to 150 students.</li>
</ul>

<h3>11. Testportal: best for business training and certification</h3>
<p>Testportal is a well-designed assessment tool built business first: its site lists human resources, training companies, certification, and sales and customer service ahead of schools. It has self-grading and open-ended questions, an AI question generator, automatic grading, and proctoring and security options. Its interface comes in English and Polish only, and its pages don’t mention negative marking or partial credit. Listing sites describe plans metered by test results a month, so one mock for 150 students uses 150 results. More in our <a href="/testportal-alternative">Testportal alternative guide</a>.</p>
<ul class="al-list">
<li><strong>Best for</strong>Companies running training checks and certifications in English.</li>
<li><strong>Watch out for</strong>No Hindi interface; Indian marking isn’t described.</li>
<li><strong>Price</strong>Free sign-up. Paid tiers are metered by results a month; check its pricing page, as listing-site figures disagree.</li>
</ul>

<h3>12. Google Forms: best for a short recap that doesn’t count</h3>
<p>Free, familiar and excellent at collecting answers. For a ten-question check at the end of a lesson it is hard to beat. As exam software it runs out quickly: there is no built-in countdown timer (you need an add-on), no native negative marking, and locked mode, the setting that keeps students inside the quiz, works only on school-managed Chromebooks. Microsoft Forms is similar, with one useful extra: a quiz timer from 1 to 999 minutes that submits on its own. Our <a href="/compare/google-forms-alternative">Google Forms comparison</a> covers when to move on.</p>
<ul class="al-list">
<li><strong>Best for</strong>Low-stakes quizzes in a school that already uses Google Workspace.</li>
<li><strong>Watch out for</strong>No exam screen, no negative marks, no rank list, no real time limit without add-ons.</li>
<li><strong>Price</strong>Free.</li>
</ul>

<h3>13. Kahoot, Wayground and Socrative: best for live quizzes in the room</h3>
<p>These are classroom engagement tools, and very good ones. Kahoot scores speed as well as correctness: by its own published formula a correct answer earns up to 1,000 points, falling with the time taken, and that speed element can’t be switched off in live games. Wayground, the new name for Quizizz, plays a similar role. Socrative is a fast lesson check with three question types and a percentage score, free for one room of 50 students.</p>
<p>That is exactly right for energy in a classroom and exactly wrong as mock-test practice, because +4/−1 punishes the fast guessing that speed points reward. Keep them for the room. See our <a href="/kahoot-alternative">Kahoot</a> and <a href="/socrative-alternative">Socrative</a> guides.</p>
<ul class="al-list">
<li><strong>Best for</strong>Revision games, exit tickets and checking a lesson in two minutes.</li>
<li><strong>Watch out for</strong>No negative marking, no exam-pattern screen; players or rooms are capped by plan.</li>
<li><strong>Price</strong>Free tiers with caps; paid plans per teacher or per seat, in US dollars.</li>
</ul>

<h3>Also considered</h3>
<p><strong>Canvas quizzes:</strong> Instructure closed Canvas Free-for-Teacher in 2026 and replaced it with Canvas Lite, which is free but limited to 5 courses of 50 learners and needs an identity check with an ID and a selfie (<a href="/canvas-quizzes-alternative">more here</a>). <strong>ClassMarker:</strong> mature and secure, priced in US dollars for companies and certification programmes. <strong>Microsoft Forms:</strong> covered under Google Forms above. If you want the broader question of what any test platform has to do, before choosing one, read <a href="/best-online-test-platform">what makes a good online test platform</a>.</p>
`),
                ],
            },
            {
                id: 'marking',
                title: 'Indian marking: the check most lists skip',
                tocLabel: 'Indian marking',
                kicker: 'The paper',
                blocks: [
                    html(`
<p>Indian entrance and recruitment papers have scoring rules that global quiz tools were not designed around: negative marks that differ by exam, partial credit with its own rules, numerical answers, and sections that close on their own clock. Here is what each platform’s own pages say, for the products where they say it.</p>
<div class="al-table-wrap al-table-wrap--wide"><table class="al-table">
<thead><tr><th scope="col">Platform</th><th scope="col">Negative marks</th><th scope="col">Partial credit (more than one correct)</th><th scope="col">Also worth knowing</th></tr></thead>
<tbody>
<tr><th scope="row" class="al-us">TestoZa</th><td data-label="Negative marks" class="al-us">Any value on each question: −1, −0.5, −0.25, −0.33</td><td data-label="Partial credit" class="al-us">Proportional, or the exact JEE Advanced rule, chosen per question</td><td data-label="Also worth knowing" class="al-us">Numerical answers by range or exact value; sections on their own clock; Hindi and bilingual</td></tr>
<tr><th scope="row">Mercer Mettl</th><td data-label="Negative marks">Yes, an Incorrect Marks field</td><td data-label="Partial credit">Not described in the pages we checked</td><td data-label="Also worth knowing">Section-wise time; 26+ question formats</td></tr>
<tr><th scope="row">SpeedExam</th><td data-label="Negative marks">Yes, an exam setting</td><td data-label="Partial credit">Not described</td><td data-label="Also worth knowing">Sections; 10 question types, essays included</td></tr>
<tr><th scope="row">ProProfs</th><td data-label="Negative marks">Yes</td><td data-label="Partial credit">Yes, partial or custom grading</td><td data-label="Also worth knowing">Each section scored and timed; free plan holds 8 quiz questions</td></tr>
<tr><th scope="row">Moodle</th><td data-label="Negative marks">A negative percentage on each wrong option</td><td data-label="Partial credit">Yes, but a question never goes below zero</td><td data-label="Also worth knowing">Single-answer negatives need Deferred feedback</td></tr>
<tr><th scope="row">Canvas New Quizzes</th><td data-label="Negative marks">A penalty for wrong choices on Multiple Answer questions</td><td data-label="Partial credit">“Partial credit with penalty”, never below zero</td><td data-label="Also worth knowing">Classic Quizzes are being retired</td></tr>
<tr><th scope="row">Google Forms</th><td data-label="Negative marks">Not built in</td><td data-label="Partial credit">Not built in</td><td data-label="Also worth knowing">No countdown timer without an add-on</td></tr>
<tr><th scope="row">Kahoot</th><td data-label="Negative marks">No; points fall with answer time</td><td data-label="Partial credit">Multi-select scored per correct answer</td><td data-label="Also worth knowing">Speed scoring can’t be switched off in live games</td></tr>
<tr><th scope="row">Socrative</th><td data-label="Negative marks">Not described</td><td data-label="Partial credit">Not described; results are a percentage</td><td data-label="Also worth knowing">Three question types</td></tr>
</tbody>
</table></div>
<p>Classplus, Testpress, Teachmint, Eklavvya, TCS iON and Testportal don’t describe, on the pages we checked, how negative marks or partial credit are set. That doesn’t mean they can’t do it. It means you should check, and the check takes five minutes: build three questions from your own paper, answer one wrong, one partly right and one blank, and see whether the score matches what the real exam would give to the decimal.</p>
<p>Why it matters: under +4/−1, four wrong guesses wipe out one correct answer. A student who practises for months on software with no penalty arrives at the real exam with a guessing habit the real paper punishes. Our <a href="/jee-mock-test-platform">JEE</a>, <a href="/neet-online-test-software">NEET</a>, <a href="/ssc-mock-test-platform">SSC</a> and <a href="/bank-exam-mock-test-platform">bank exam</a> guides set out each pattern in full.</p>
`),
                ],
            },
            {
                id: 'cost',
                title: 'What a year really costs: the price meters, worked through',
                tocLabel: 'What it costs',
                kicker: 'The money',
                blocks: [
                    html(`
<p>A price on its own tells you little. What matters is what the price counts, multiplied by how much you test. Take a typical mid-sized coaching institute:</p>
<ul class="al-list">
<li>3 batches of 120 students = <strong>360 students</strong></li>
<li>A weekly test for each batch, plus one full mock a month = about <strong>5 sittings per student a month</strong></li>
<li>So about <strong>1,800 sittings a month, or 21,600 a year</strong></li>
</ul>
<p>Here is what that volume means on each kind of meter, using each company’s own published prices where it publishes them:</p>
<div class="al-table-wrap al-table-wrap--wide"><table class="al-table">
<thead><tr><th scope="col">Platform</th><th scope="col">What the price counts</th><th scope="col">360 students, 1,800 sittings a month</th></tr></thead>
<tbody>
<tr><th scope="row" class="al-us">TestoZa</th><td data-label="What it counts" class="al-us">Time: a pass for 7 days, 30 days or a year</td><td data-label="For 360 students" class="al-us">₹799 for the year. The same for 36 students or 3,600.</td></tr>
<tr><th scope="row">SpeedExam</th><td data-label="What it counts">Exam attempts a month, retakes and unfinished attempts included</td><td data-label="For 360 students">1,800 attempts is more than Professional’s 500, so Ultimate (3,500): $1,500 a year, or $180 a month billed monthly</td></tr>
<tr><th scope="row">ProProfs</th><td data-label="What it counts">Active quiz takers a month, per 100</td><td data-label="For 360 students">More than Essentials’ 300, so Business at $39.99 per 100: about $160 a month for four blocks</td></tr>
<tr><th scope="row">Eklavvya</th><td data-label="What it counts">Exam credits: one candidate sitting one exam</td><td data-label="For 360 students">About 21,600 credits a year; paid plans are quoted</td></tr>
<tr><th scope="row">Mettl, TCS iON, Classplus, Teachmint</th><td data-label="What it counts">Not published</td><td data-label="For 360 students">A quote after a demo</td></tr>
<tr><th scope="row">Google Forms, Moodle</th><td data-label="What it counts">Nothing; free software</td><td data-label="For 360 students">Free, plus the add-ons, hosting and time they need to work as exam software</td></tr>
</tbody>
</table></div>
<p>The pattern is simple. Practice tests are where an institute’s volume is. A meter that counts candidates or attempts is fair for an organisation that tests a few hundred people a few times a year, which is who most of these products were designed for. It gets expensive for one that tests the same students every week, and it quietly discourages retakes, which are among the most useful things a student can do.</p>
<p>Two smaller things to ask any vendor: are prices billed in rupees or in US dollars (dollar prices move with the exchange rate), and what happens on the day you go over the limit, mid-exam?</p>
`),
                ],
            },
            {
                id: 'trial',
                title: 'How to choose: a one-week trial, and when TestoZa is the wrong pick',
                tocLabel: 'Trial and limits',
                kicker: 'Before you decide',
                blocks: [
                    html(`
<p>No list can tell you how a platform handles your paper and your students. One week of trying it can. Run these six checks on any platform on your shortlist, TestoZa included, with your own paper rather than the vendor’s sample:</p>
${stepsFallback(P)}
<p>At the end you have the only two numbers that matter: how many of your students actually sat the test, and how long it took you from a PDF to a rank list.</p>
<h3>When TestoZa is the wrong pick</h3>
<p>We would rather you chose the right tool than ours. TestoZa is not the right one if you need any of these:</p>
<ul class="al-limits">
<li><strong>Webcam, microphone or screen proctoring.</strong> TestoZa uses browser rules (full screen, counted tab switches that can submit the paper, copy and paste off) and a live list for the teacher. It never uses the camera. For a hiring or licensing exam, use Mercer Mettl, Eklavvya or SpeedExam.</li>
<li><strong>Identity checks for strangers.</strong> Candidates check in by name, roll number and an optional PIN, which is enough for your own students and not enough for unknown applicants.</li>
<li><strong>Descriptive answers and handwritten scripts.</strong> TestoZa marks objective and numerical questions. For written exams marked on screen, look at Eklavvya or TCS iON’s Digital Marking.</li>
<li><strong>A branded app, video courses or fee collection.</strong> That is Classplus or Testpress territory.</li>
<li><strong>A full course system.</strong> Assignments, discussions and a term gradebook belong in Moodle or Canvas.</li>
<li><strong>Psychometric, coding or aptitude tests for hiring.</strong> Mercer Mettl does these well.</li>
</ul>
<p>And if the job is weekly tests and mock series for students who write on their phones, it is the job TestoZa was built for. Start with <a href="/mobile-friendly-online-exam">how a phone exam handles calls, dropped signal and dead batteries</a> or <a href="/how-to-conduct-online-exam">how to conduct an online exam</a> step by step.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'What is the best online exam software in India?',
                a: 'It depends on what the exam decides. For weekly tests and mock series for your own students, TestoZa runs on any phone without an app and marks JEE, NEET, SSC and bank patterns, from ₹799 a year. For proctored hiring, university or certification exams, Mercer Mettl or Eklavvya. For national-scale exams in test centres, TCS iON. For a branded coaching app, Classplus or Testpress. For a quick class quiz, Google Forms or Kahoot.',
            },
            {
                q: 'Which online exam software is best for coaching institutes?',
                a: 'One that students can sit on their own phones without installing anything, that marks +4/−1 with partial credit and numerical answers, that gives a rank list the same evening, and whose price doesn’t grow with every student. TestoZa is built for this. If you also want your own app for video courses and fees, Classplus or Testpress include tests as one module.',
            },
            {
                q: 'Which online exam software is best for schools?',
                a: 'For unit tests and pre-boards made by teachers, a platform that turns a PDF or a photo of the textbook into a test, works in Hindi or both languages and prints report cards, such as TestoZa. If the school is buying smart classroom panels, Teachmint bundles a platform with them. Google Forms is fine for short recaps.',
            },
            {
                q: 'Which online exam platform is best for proctored university or recruitment exams?',
                a: 'An enterprise suite with webcam proctoring and identity checks: Mercer Mettl for hiring, aptitude and proctored exams, Eklavvya for university exams with descriptive answers marked on screen, SpeedExam if you want certificates and a published price, and TCS iON for large exams held in test centres. Mettl’s proctored tests need a laptop or desktop with a webcam.',
            },
            {
                q: 'Is there free online exam software in India?',
                a: 'Yes. TestoZa is free to build tests, run live exams and see results, with paid plans from ₹49 for 7 days for extra exam rules. Google Forms is free but has no timer or negative marking without add-ons. SpeedExam is free for 25 attempts a month, Eklavvya for 25 exam credits, and ProProfs for quizzes of up to 8 questions. Moodle is free software, but you pay for hosting.',
            },
            {
                q: 'Which online exam software works on mobile phones?',
                a: 'TestoZa runs in the phone’s ordinary browser with no app, and a candidate can rejoin on another phone if theirs dies. SpeedExam says it is mobile and tablet friendly. Classplus is built around your institute’s own app. Mercer Mettl’s help centre says its proctored assessments are not supported on phones or tablets.',
            },
            {
                q: 'Which online exam software supports negative marking?',
                a: 'TestoZa (any value on each question, plus JEE Advanced partial marks), Mercer Mettl, SpeedExam and ProProfs all describe negative marking. Moodle can do it as a negative percentage per option, with conditions. Google Forms has no built-in negative marking, and Kahoot scores speed instead.',
            },
            {
                q: 'How much does online exam software cost in India?',
                a: 'It ranges from free to enterprise quotes, and the meter matters more than the price. TestoZa charges for time (₹49 for 7 days, ₹149 for 30 days, ₹799 a year) with no per-candidate fee. SpeedExam counts attempts a month ($240 a year for 500), ProProfs counts active quiz takers ($19.99 per 100 a month), Eklavvya counts exam credits, and Mettl, TCS iON, Classplus and Teachmint quote after a demo.',
            },
            {
                q: 'Can students take an online exam without installing an app?',
                a: 'On TestoZa, yes: they open testoza.com/join in any browser, type a six-digit code and their name or roll number. Answers save every 20 seconds. App-based platforms such as Classplus are built around the institute’s own app, and lockdown tools such as Safe Exam Browser need software installed on the device.',
            },
            {
                q: 'Is this comparison biased because TestoZa wrote it?',
                a: 'We make TestoZa, so read it with that in mind. To keep it fair, every other product is described only from its own website, pricing page and help centre, checked in October 2026; third-party prices are labelled; and the guide lists six cases where TestoZa is the wrong pick, including proctored hiring exams and descriptive answers.',
            },
        ],

        closingTitle: 'Your own paper is the best test of any list.',
        closing: [
            html(`
<p>Take one paper you have already set and run it on a platform this week. If you start with TestoZa:</p>
<div class="al-paths">
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Paper already written?</span><span class="al-path-what">Upload the PDF and let the AI read it</span></a>
<a class="al-path" href="/create-test" data-icon="pencil"><span class="al-path-who">Starting from scratch?</span><span class="al-path-what">Build it with +4/−1 and sections</span></a>
<a class="al-path" href="/user-guide/live-exam-sessions" data-icon="key"><span class="al-path-who">Running it for a batch?</span><span class="al-path-what">See how join codes and the exam room work</span></a>
</div>
<p>Related reading: <a href="/cbt-exam-software">CBT exam software</a>, <a href="/full-length-online-test-maker">full-length mock tests</a>, <a href="/hindi-online-test-maker">Hindi online test maker</a>, <a href="/share-test-on-whatsapp">sharing a test on WhatsApp</a>, <a href="/guides">all guides</a> and <a href="/pricing">pricing</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Eklavvya',
                links: [
                    { label: 'Eklavvya home', href: 'https://www.eklavvya.com/' },
                    { label: 'Pricing', href: 'https://www.eklavvya.com/pricing/' },
                ],
            },
            {
                label: 'TCS iON',
                links: [
                    { label: 'TCS iON home', href: 'https://www.tcsion.com/' },
                    { label: 'National Qualifier Test', href: 'https://www.tcsion.com/hub/national-qualifier-test/' },
                ],
            },
            {
                label: 'Testpress',
                links: [{ label: 'Testpress home', href: 'https://testpress.tech/' }],
            },
            {
                label: 'Mercer | Mettl',
                links: [
                    { label: 'Examination platform', href: 'https://mettl.com/en/examination-management-system/' },
                    { label: 'Online proctoring', href: 'https://mettl.com/en/online-remote-proctoring/' },
                    { label: 'System requirements', href: 'https://support.mettl.com/portal/en/kb/articles/system-requirement-for-mettl-assessment-platform' },
                    { label: 'Capterra listing (third-party price)', href: 'https://www.capterra.com/p/264763/Mercer-Mettl-Online-Examination-and-Proctoring-Solutions/' },
                ],
            },
            {
                label: 'SpeedExam',
                links: [
                    { label: 'SpeedExam home', href: 'https://www.speedexam.net/' },
                    { label: 'Pricing', href: 'https://www.speedexam.net/pricing' },
                    { label: 'Features', href: 'https://www.speedexam.net/features/' },
                ],
            },
            {
                label: 'Classplus and Teachmint',
                links: [
                    { label: 'Classplus website', href: 'https://classplusapp.com/' },
                    { label: 'Classplus on Capterra', href: 'https://www.capterra.com/p/208852/Class-Plus/' },
                    { label: 'Teachmint website', href: 'https://www.teachmint.com/' },
                ],
            },
            {
                label: 'Moodle',
                links: [
                    { label: 'Moodle statistics', href: 'https://stats.moodle.org/' },
                    { label: 'Installation quick guide', href: 'https://docs.moodle.org/502/en/Installation_quick_guide' },
                    { label: 'Multiple choice question type', href: 'https://docs.moodle.org/502/en/Multiple_Choice_question_type' },
                    { label: 'Safe Exam Browser', href: 'https://docs.moodle.org/502/en/Safe_Exam_Browser' },
                ],
            },
            {
                label: 'ProProfs and Testportal',
                links: [
                    { label: 'ProProfs pricing', href: 'https://www.proprofs.com/quiz-school/signup/business/' },
                    { label: 'ProProfs exam software', href: 'https://www.proprofs.com/quiz-school/solutions/exam-software/' },
                    { label: 'Testportal website', href: 'https://www.testportal.net/' },
                ],
            },
            {
                label: 'Google Forms and Microsoft Forms',
                links: [
                    { label: 'Use locked mode for quizzes', href: 'https://support.google.com/docs/answer/7634943' },
                    {
                        label: 'Set a timer in Microsoft Forms',
                        href: 'https://support.microsoft.com/en-us/office/set-a-timer-for-forms-or-quizzes-in-microsoft-forms-f9d3d391-55d0-4c06-a004-320c92c8c091',
                    },
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
                label: 'Canvas',
                links: [{ label: 'Canvas Lite announcement', href: 'https://www.instructure.com/press-release/instructure-announces-canvas-lite-new-free-course-tool-built-educators' }],
            },
            {
                label: 'Phones in India',
                links: [{ label: 'Statcounter, mobile operating systems in India', href: 'https://gs.statcounter.com/os-market-share/mobile/india' }],
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
