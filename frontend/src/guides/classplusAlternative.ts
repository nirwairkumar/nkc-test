/**
 * testoza.com/classplus-alternative — the two halves of what an app platform sells
 * (the app, the course sales and the fees on one side, the tests on the other), which
 * half a test platform can replace, and what moving only the exams looks like.
 * Written for coaching institute owners and the teacher who sets the Sunday paper.
 *
 * Classplus facts (checked 10 October 2026, sources in `sources`):
 *   - classplusapp.com sells a branded app for coaching institutes; its own title line
 *     reads "Best App for Online Teaching — Aapki Coaching Aapki App".
 *   - No price is published on the site: the call to action is a form and a demo call.
 *     Reseller and listing sites quote annual figures between about ₹8,000 and ₹50,000,
 *     some mentioning a setup fee and a commission on course sales. Those are third-party
 *     numbers, they disagree with each other, and this page says so instead of quoting
 *     one as fact.
 *   - Listings describe live lectures, recorded content, online tests with automatic
 *     checking, attendance, fee collection and a branded app on Play Store.
 *   - Review sites note the testing module is basic next to dedicated assessment tools
 *     (no item analysis or adaptive testing) and that multi-branch institutes can
 *     outgrow it.
 *
 * TestoZa claims are the same set the Moodle guide checked against the code, plus
 * sectional timing (built 8 October 2026) and /join/result. Not in the product, and
 * never to be implied: a branded app, course selling, fee collection, live classes,
 * attendance registers, essays, file uploads, a term gradebook, LTI.
 */
import { ALT_RIVALS, SCHEMES, mark } from './altData';
import { CLASSPLUS_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const R = ALT_RIVALS.classplus;

/** The widget text crawlers get: written from the same data the widgets render. */
const FIT_FALLBACK = `
<p>A checklist of what institutes open ${R.name} for. What ${R.name} is for: ${R.uses
    .filter((u) => u.kind === 'core')
    .map((u) => u.label.toLowerCase())
    .join('; ')}. The testing part: ${R.uses
    .filter((u) => u.kind === 'exam')
    .map((u) => u.label.toLowerCase())
    .join('; ')}. Three answers come out of it. ${R.verdicts.keep.title}: ${R.verdicts.keep.text} ${R.verdicts.split.title} ${R.verdicts.split.text} ${R.verdicts.switch.title}: ${R.verdicts.switch.text}</p>`;

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

const MARKING_FALLBACK = `
<p>One physics question — a 2 kg body moving at 3 m s⁻¹ brought to rest in 0.5 s, answer 12 N — scored two ways. Plain right/wrong scoring, the default in a quiz module, gives 1 mark for the correct option and takes nothing off for a wrong one, so a guess is free. In TestoZa the same answer is worth the two numbers you typed on the question card: ${SCHEMES.filter(
    (s) => s.wrong,
)
    .map((s) => `${s.full} +${mark(s.right)} with −${mark(s.wrong)} for a wrong tick`)
    .join(', ')}. Four wrong guesses under +4/−1 wipe out a correct answer, which is the arithmetic a mock has to teach.</p>`;

const MOVE_FALLBACK = `
<ol class="al-list al-list--num">
${R.steps.map((s) => `<li><strong>${s.title} (${s.minutes} min)</strong>${s.detail}</li>`).join('\n')}
</ol>
<p>About ${R.steps.reduce((a, s) => a + s.minutes, 0)} minutes for a 30-question paper you already have, including reading every question once before it goes live.</p>`;

export const CLASSPLUS_ALTERNATIVE: Guide = {
    meta: CLASSPLUS_META,
    body: {
        intro: [
            html(`
<p>“Classplus alternative” is two different searches wearing the same words.</p>
<p>One is an institute that wants what Classplus sells — an app with its own name on it, courses to sell inside it, fees collected through it — and wants it cheaper, or from a company whose salesperson calls back faster. That search ends at other app builders, and this guide will point you at the category rather than pretend otherwise.</p>
<p>The other is far more common, and it sounds like this in a WhatsApp group: <em>the app is fine, but the tests are a mess</em>. Sunday’s paper took a teacher an evening to type in. Thirty students couldn’t get in because they had forgotten the password to an app they open twice a month. The marking gave full marks for a guess, so the rank list flattered everybody and told you nothing. There is no way to put +4 and −1 on a question, and the “analysis” is a percentage.</p>
<p>If that is your search, you are not looking for another app platform. You are looking for the exam half to be done properly, and the two halves can be bought separately. This guide separates them: what only an app platform can do, what only exam software does well, what a test platform costs when the price is printed instead of quoted, and how long it takes to move one paper across. It is written by the team behind TestoZa, so treat the TestoZa parts as an interested party’s account — the facts are checkable, and every claim about Classplus comes from its own site or from public listings, marked as such.</p>
`),
        ],

        answer:
            'Decide which half of Classplus you are actually replacing. If you need a branded app on Play Store, course sales, fee collection and live lectures, no test platform replaces that — compare app builders with each other instead. If the part that hurts is the tests, move only the tests: a dedicated exam platform gives you +4/−1 and partial marking on each question, a six-digit join code instead of a student login, AI that turns a PDF or a photo of a paper into a test, sectional timers, a live exam room with extra time, and rank lists, report cards and per-question analysis the same evening. TestoZa is one such platform: building and running tests is free, paid plans are ₹49 for 7 days, ₹149 for 30 days or ₹799 for a year, with no setup fee and no commission on your fees. It is not an app platform: no branded app, no course storefront, no fee module, no live classes.',

        sections: [
            {
                id: 'two-halves',
                title: 'First, which half are you replacing?',
                tocLabel: 'Which half',
                kicker: 'Start here',
                blocks: [
                    html(`
<p>An app platform for coaching institutes sells a bundle. Inside it are two very different products that happen to be billed together.</p>
<p>The first is a <strong>business platform</strong>: an app carrying your institute’s name, a storefront for batches and courses, fee collection with instalments and reminders, live and recorded lectures, announcements to parents. This is a real product and a genuinely hard one to build. Nobody should underestimate what it takes to publish and maintain an app on the Play Store, or to collect fees from four hundred families without a spreadsheet.</p>
<p>The second is an <strong>exam engine</strong>: a question bank, a paper, a clock, a marking scheme, an exam screen, a mark sheet. This is also a real product, and it is the one that gets squeezed inside a bundle, because the bundle’s selling points are the app and the sales. Test modules inside app platforms tend to stop at multiple-choice questions, automatic right/wrong checking, and a percentage.</p>
<p>So switch on what your institute actually uses in a normal week, and read the answer honestly:</p>
`),
                    { type: 'widget', widget: 'alt-fit', fallbackHtml: FIT_FALLBACK },
                    html(`
<p>Most institutes land on one of three answers:</p>
<ul class="al-list">
<li><strong>Keep the app platform.</strong> You sell courses through it, collect fees through it, and your students know your institute by that icon on their phone. An exam tool replaces none of that. If the price is the problem, compare app builders against each other — and ask each of them the marking questions further down this page, because that is where they differ most.</li>
<li><strong>Keep the app. Move the tests.</strong> The common answer for a growing institute. Courses, fees and lectures stay where the students already are; tests move to software built for exam patterns. You put the test link or the join code inside your own app, and nothing about your branding changes.</li>
<li><strong>You never needed the app.</strong> Plenty of institutes signed for an app because tests, notices and fee reminders all came in one box, then discovered that the app is used for tests and the batch group on WhatsApp does the rest. That is a yearly contract paying for one module.</li>
</ul>
<p>The rest of this page is about the second and third answers.</p>
`),
                ],
            },
            {
                id: 'why-people-look',
                title: 'Why institutes start looking in the first place',
                tocLabel: 'Why people look',
                kicker: 'The honest list',
                blocks: [
                    html(`
<p>In four years of talking to coaching institutes, the same five reasons come up. None of them is “the software crashed”.</p>
<h3>1. The price is a conversation, not a number</h3>
<p>Classplus does not publish a price. The website’s call to action is a form, and a salesperson calls back with a quote. Reseller and listing sites put the annual figure anywhere between about ₹8,000 and ₹50,000, some mentioning a setup fee and a share of what you sell through the app — but those are third-party numbers that disagree with each other, so your quote is your own. The practical problem is not the amount. It is that you cannot compare what you cannot see, and the quote arrives after you have spent forty minutes on a call.</p>
<h3>2. It is sold as a yearly platform, not as tests</h3>
<p>You are buying a year of a platform. If the testing part turns out to be thin for your exam pattern, you discover it in month two and live with it until month twelve.</p>
<h3>3. Every student needs an account that works</h3>
<p>An app login is fine for a student who opens the app daily for lectures. It is a support call for the student who opens it twice a month for a test — and exam day is precisely when you are least able to answer support calls.</p>
<h3>4. The marking is not your exam’s marking</h3>
<p>This is the big one, and it gets a section of its own below. If a mock cannot take marks off for a wrong answer, the rank list it produces is not a prediction of anything.</p>
<h3>5. Getting questions in eats teacher time</h3>
<p>Every institute has a decade of papers as PDFs, printed sheets and handwritten pages. Typing them into a form, one question at a time, with diagrams pasted in as screenshots, is the hidden cost of any test module. It is usually paid in a senior teacher’s evening.</p>
<p>Notice that four of the five are about the tests. That is why “move only the tests” is so often the right answer.</p>
`),
                ],
            },
            {
                id: 'side-by-side',
                title: 'Classplus and a test platform, question by question',
                tocLabel: 'Side by side',
                kicker: 'Side by side',
                blocks: [
                    html(`
<p>Comparison tables flatter whoever writes them, so this one is built as questions an institute owner would actually ask, with the answer for each side and what it costs you in practice. Pick a question:</p>
`),
                    { type: 'widget', widget: 'alt-compare', fallbackHtml: COMPARE_FALLBACK },
                    html(`
<p>If you take one thing from the table, take the exit question. Ask any platform, in writing, before you sign: <em>if we leave, what can we take, in what format, and how long do we have to download it?</em> A company confident in its product answers in a line. The answer also tells you what the contract is really about.</p>
`),
                ],
            },
            {
                id: 'marking',
                title: 'Marking is where test modules and exam software part company',
                tocLabel: 'Marking',
                kicker: 'The real difference',
                blocks: [
                    html(`
<p>Everything else on this page can be worked around. Marking cannot, and it is the thing least likely to be demonstrated in a sales call.</p>
<p>Indian exams do not score answers; they score decisions. JEE Main and NEET give +4 for a correct answer and take 1 mark off for a wrong one, so a wrong tick is five marks worse than a blank. SSC Tier 1 is +2 with −0.5. IBPS and SBI papers take off a quarter of a mark, and some sections produce marks like 0.857. JEE Advanced pays +1 per correct option on a multiple-correct question but nothing if a single wrong option is ticked. Each of these teaches a different habit, and the habit is most of what a mock is for.</p>
<p>Try the same question under both models. Pick the right option, then come back and pick a wrong one deliberately — the wrong answer is the interesting half:</p>
`),
                    { type: 'widget', widget: 'alt-marking', fallbackHtml: MARKING_FALLBACK },
                    html(`
<p>In TestoZa this is two fields on each question card, <strong>Marks</strong> and <strong>Wrong</strong>, and a new question copies the previous one’s, so a 90-question paper is set once. Beyond the two numbers:</p>
<ul class="al-list">
<li><strong>Partial marks on multiple-correct questions,</strong> either proportional or the JEE Advanced +1-per-option rule, with the negative applied if any wrong option is ticked.</li>
<li><strong>Numerical answers as a range,</strong> so 9.8 and 9.81 can both be right, and two-decimal answers behave the way the real paper expects.</li>
<li><strong>Sections with their own clock,</strong> for the SSC and bank patterns where a section closes on its own and cannot be reopened.</li>
<li><strong>Scored on the server,</strong> not in the browser, which matters the first time a student asks why their total changed.</li>
</ul>
<p>When you evaluate any platform — ours, Classplus or a third — do not ask “does it support negative marking?”. Ask the salesperson to build, on the call, a question worth +4 with −1, a multiple-correct question with partial marks, and a numerical answer accepted between 9.75 and 9.85. The demo either does it in a minute or it does not.</p>
`),
                ],
            },
            {
                id: 'exam-day',
                title: 'Exam day without a single student login',
                tocLabel: 'Exam day',
                kicker: 'Sunday, 10 a.m.',
                blocks: [
                    html(`
<p>Exam day is the only day of the month where software either saves you or embarrasses you in front of a hundred and twenty parents’ children. The most common failure has nothing to do with questions: it is access. Accounts, passwords, app versions, a phone that was logged in as an elder sibling.</p>
<p>A join code removes the category. In TestoZa you give a paper to a batch as a live exam and get a six-digit code, a QR code and a projector view. Candidates go to <a href="/join">testoza.com/join</a>, type the code and check in by name, by roll number, or by roll number and a four-digit PIN if you want the stricter version. No account, no install, nothing to remember.</p>
<ol class="al-list al-list--num">
<li><strong>The lobby.</strong> Names appear as candidates check in. You can see who is missing before you start, not after.</li>
<li><strong>Start.</strong> Press it when the room is ready, or set a time and let it start itself. Late arrivals can still be let in.</li>
<li><strong>The live list.</strong> Every candidate with minutes left, questions answered, and flags: no signal, changed device, left the exam screen. Warnings are counted, and on paid plans a limit can submit the paper automatically.</li>
<li><strong>Extra time.</strong> +5 or +10 minutes for one candidate whose phone died; 5, 10, 15 or 30 for everyone still writing when the building’s internet wobbles.</li>
<li><strong>Nothing lost.</strong> Answers are saved to the server every 20 seconds. A candidate can rejoin on another device with the same details and carry on. Papers submit themselves when time runs out, and “End exam” submits whatever is saved for anyone still writing.</li>
</ol>
<p>The projector view is worth a mention because it is the cheapest invigilation there is: the code, a QR code, names appearing as students join, and a countdown, on the wall of the hall.</p>
`),
                ],
            },
            {
                id: 'questions-in',
                title: 'Your question bank, in without an evening of typing',
                tocLabel: 'Getting questions in',
                kicker: 'The hidden cost',
                blocks: [
                    html(`
<p>The subscription is never the real cost of a test platform. Teacher-hours are. An institute with six years of papers has, somewhere, a drawer of printed sheets and a folder of PDFs, and the question is how those become tests without a data-entry project.</p>
<p>TestoZa’s answer is to read them. Upload a PDF, or photograph a printed or handwritten page with a phone, and the AI pulls out questions, options, the answer key, diagrams and equations. Supported files are PDF, PNG, JPG and WEBP. The practical notes matter more than the feature:</p>
<ul class="al-checks">
<li><strong>Diagrams come across as diagrams.</strong> A circuit, a graph or a ray diagram is cropped from the page and attached to the question, rather than left behind.</li>
<li><strong>Equations are typeset, not screenshots.</strong> Integrals, vectors and chemical equations render as text, so they stay sharp on a small screen and reflow instead of cutting off.</li>
<li><strong>Hindi and bilingual papers.</strong> The AI keeps your material’s language, or writes questions in English, Hindi or both. In the builder, Hindi can be typed with English letters.</li>
<li><strong>You still read every question once.</strong> This is not optional and we will not pretend otherwise: AI misreads a smudged subscript or an option order now and then. Reading a 30-question paper takes about eight minutes, which is still an evening saved.</li>
<li><strong>Writing from scratch is fine too.</strong> The builder has an on-screen keyboard (Sy Pad) for maths and chemistry notation, so a teacher who has never seen LaTeX can type a definite integral.</li>
</ul>
<p>Four question types cover almost every paper an institute sets: single correct, multiple correct, numerical, and comprehension passages. Essays and file uploads are not there — if your tests need a handwritten answer scanned and graded, this is the wrong tool and you should say so early.</p>
`),
                ],
            },
            {
                id: 'results',
                title: 'What the student, the parent and the teacher each get',
                tocLabel: 'Results',
                kicker: 'After the paper',
                blocks: [
                    html(`
<p>A percentage is not a result. An institute needs three different documents out of one paper, and they go to three different people.</p>
<h3>The teacher: what the batch got wrong</h3>
<p>A rank list fills in as papers come in, with the class average, the highest and the lowest, and section-by-section averages where the paper has sections. Per question you get how many attempted it, how many got it right, how long they spent on it, and which wrong option most of them chose. That last number is the useful one: a question where 60% of the batch picked the same wrong option is either a misconception you can fix on Monday or a question you wrote badly.</p>
<h3>The parent: something printable</h3>
<p>Report cards print or save as PDF. If you have a parent’s number in the batch list, a WhatsApp message can be opened for that parent with the marks in it — you press send, nothing is sent automatically, and nobody’s number is used for anything else.</p>
<h3>The student: their own paper back</h3>
<p>Results can be released when the exam ends, immediately as each paper is submitted, or by hand when you have checked them. Candidates who sat a live exam can look up their own result later with the code, and the answer key is never pushed to a session candidate’s screen before you release it.</p>
<p>Everything above comes out as Excel too, because sooner or later a batch decision gets made in a spreadsheet.</p>
`),
                ],
            },
            {
                id: 'move-one-paper',
                title: 'Moving one paper across, this week',
                tocLabel: 'Moving a paper',
                kicker: 'Try it small',
                blocks: [
                    html(`
<p>Do not migrate anything. Take one paper you have already used, run it with one batch, and compare the evening afterwards with the last one. Here is the whole job, with honest minutes:</p>
`),
                    { type: 'widget', widget: 'alt-move', fallbackHtml: MOVE_FALLBACK },
                    html(`
<p>Two things to watch while you do it. First, whether the marking came out exactly as your paper marks — check a student who guessed four questions and see whether the total punished it. Second, how many access problems you had, because that number should be zero and it is the one your office staff will notice.</p>
<p>If the test went well, the sensible next step is not to move everything. It is to use the exam platform for the papers that count and leave the rest alone until the contract you are on comes up for renewal. Then you will have real evidence for that renewal conversation instead of a feeling.</p>
`),
                ],
            },
            {
                id: 'where-we-lose',
                title: 'Where a test platform is the wrong answer',
                tocLabel: 'Where we lose',
                kicker: 'Being straight',
                blocks: [
                    html(`
<p>A page like this is worthless if it only lists wins, so here is the other column. TestoZa does not do any of the following, and if one of them is why you bought an app platform, keep it:</p>
<ul class="al-limits">
<li><strong>A branded app.</strong> There is no app with your institute’s name and icon on the Play Store, and there is no plan to build one. TestoZa is a website.</li>
<li><strong>Selling courses.</strong> No storefront, no coupons, no payment gateway for your batches, no revenue dashboard for course sales.</li>
<li><strong>Fee collection.</strong> No instalments, no receipts, no fee reminders, no defaulter list.</li>
<li><strong>Live and recorded classes.</strong> No video calls, no recordings, no library of lectures.</li>
<li><strong>Attendance and admissions.</strong> No daily register, no enquiry pipeline, no admission forms.</li>
<li><strong>Essays and file uploads.</strong> Marking is automatic, which means answers have to be machine-checkable: options, numbers, ranges. A scanned handwritten answer cannot be graded here.</li>
<li><strong>Integrations.</strong> No LTI, no ERP connector, no API hand-off to your app. The bridge between tools is an Excel download, and that is worth knowing before you plan around it.</li>
</ul>
<p>There is an arrangement that works well for institutes that need both, and it is worth stating plainly because it is what most of our coaching customers do: keep the app for what students open daily, and put a link or a six-digit code inside it for test day. Students never leave your brand; the paper is just hosted by software that knows what +4 and −1 mean. Nobody has to choose between an app and an exam.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'What is the best Classplus alternative for coaching institutes?',
                a: 'It depends which half you mean. If you want a branded app with course sales and fee collection, you are shopping in the app-builder category and should compare those products with each other on price, contract length and what happens to your data when you leave. If what you want is the testing part done properly — exam-pattern marking, join codes instead of logins, per-question analysis — then a dedicated exam platform such as TestoZa is the closer fit, and it can sit inside the app you already have.',
            },
            {
                q: 'How much does Classplus cost?',
                a: 'Classplus does not publish a price. Its website asks you to fill a form for a demo, and the quote comes on the call. Listing and reseller sites put the annual figure anywhere between roughly ₹8,000 and ₹50,000, with mentions of a setup fee and a commission on course sales, but those numbers are third-party, they contradict each other, and none of them is the price you will be offered. Ask for the full figure in writing, including setup, renewal and any share of your sales.',
            },
            {
                q: 'Can I use TestoZa for tests and keep my Classplus app?',
                a: 'Yes, and it is the most common arrangement. Your app keeps doing lectures, fees and notices. For a test you share a link, or give the batch a six-digit code they enter at testoza.com/join — you can put either inside your app, or in the batch group. Results download as Excel if you want them in your own records. There is no API or LTI connection between the two, so the hand-off is a file, not an integration.',
            },
            {
                q: 'Does TestoZa support +4/−1 negative marking and partial marks?',
                a: 'Yes. Every question card has two fields, Marks and Wrong, so +4 with −1, +2 with −0.5 or +1 with −0.25 are typed in directly, and a new question copies the previous one’s. Multiple-correct questions can give proportional partial marks or the JEE Advanced +1-per-correct-option rule, with the negative applied if any wrong option is ticked. Numerical answers are accepted as a range, and sections can have their own clock.',
            },
            {
                q: 'Do my students need to install an app or create accounts?',
                a: 'No. For a live exam they open testoza.com/join in any browser, type the six-digit code and check in by name or roll number — optionally with a four-digit PIN. Answers save to the server every 20 seconds, so if a phone dies they rejoin on another device and carry on. Signing in is only needed for a student practising on their own.',
            },
            {
                q: 'What does TestoZa cost, and is there a commission on my fees?',
                a: 'Building tests, running live exams, marking, rank lists and report cards are free. Paid plans are ₹49 for 7 days, ₹149 for 30 days and ₹799 for a year, and add things like the exam rules (forced full screen, tab-switch limits). There is no setup fee, no per-student charge, no cap on candidates in a sitting and no commission on what you earn.',
            },
            {
                q: 'Can I move my existing question bank over?',
                a: 'A paper at a time, yes: upload the PDF, or photograph the printed or handwritten sheet, and the AI reads questions, options, the key, diagrams and equations, with the answer key as a separate file if you have one. There is no importer for another platform’s database format, so a ten-year bank is a project rather than an afternoon. Start with the papers you still use.',
            },
            {
                q: 'Is TestoZa suitable for a multi-branch institute?',
                a: 'For tests, yes: a paper can be run as separate sittings for separate batches, and each sitting gets its own rank list, while report cards and Excel exports keep the batches apart. What it does not have is a branch-level administration layer — staff roles per branch, fee reconciliation across centres, a head-office dashboard. If you need those, you need an institute management system, and the exams can still live outside it.',
            },
            {
                q: 'Can students take tests in Hindi?',
                a: 'Yes. Papers can be in Hindi, in English, or bilingual with both languages on each question, and the AI will keep your material’s language or write the second language for you. In the builder, Hindi can be typed using English letters, which is faster than a Devanagari keyboard for most teachers.',
            },
        ],

        closingTitle: 'Try it on Sunday’s paper',
        closing: [
            html(`
<p>The decision does not need a meeting. It needs one paper and one batch:</p>
<div class="al-paths">
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Paper already a PDF or a photo?</span><span class="al-path-what">Turn it into a test with AI</span></a>
<a class="al-path" href="/create-test" data-icon="pencil"><span class="al-path-who">Setting a new paper?</span><span class="al-path-what">Build it with +4/−1 and sections</span></a>
<a class="al-path" href="/user-guide/live-exam-sessions" data-icon="key"><span class="al-path-who">Running it for a batch?</span><span class="al-path-what">See how join codes and the exam room work</span></a>
</div>
<p>Related reading: <a href="/online-test-for-coaching">TestoZa for coaching institutes</a>, <a href="/best-online-test-platform">how to choose an online test platform</a>, <a href="/ai-test-generator">the AI test generator</a>, <a href="/how-to-conduct-online-exam">how to conduct an online exam</a> and <a href="/pricing">pricing</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Classplus',
                links: [
                    { label: 'Classplus website', href: 'https://classplusapp.com/' },
                    { label: 'Classplus on Capterra', href: 'https://www.capterra.com/p/208852/Class-Plus/' },
                    { label: 'Classplus on Techjockey', href: 'https://www.techjockey.com/detail/classplus' },
                    { label: 'Classplus on SoftwareSuggest', href: 'https://www.softwaresuggest.com/classplus' },
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
