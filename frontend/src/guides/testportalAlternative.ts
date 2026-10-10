/**
 * testoza.com/testportal-alternative — a business-first assessment tool next to software
 * built for Indian student exams: who each product thinks you are, what the price meter
 * counts, the marking gap, the device, and where Testportal still wins.
 * Written for coaching institute owners, school exam cells and training managers.
 *
 * Testportal facts (checked 10 October 2026 against testportal.com, sources in `sources`):
 *   - The site splits customers into Business — Human Resources, Training Companies &
 *     Departments, Certification, Sales & Customer Service, Language Schools — and
 *     Education: Teachers, Schools, Universities & Colleges. Business is listed first and
 *     the Pricing link goes to business plans.
 *   - Features named on the home page: "Self-grading, Open-ended & Choice questions"
 *     ("Use a variety of test questions"), Automatic Grading, "automated feedback and
 *     grading", an AI generator that makes choice questions from uploaded materials or a
 *     topic, "Proctoring & Security", Security. Negative points and partial credit are
 *     not mentioned anywhere on it.
 *   - Language switch: English and Polski only.
 *   - Sign-up is free, "No credit card required"; the home page shows no plan names,
 *     prices or usage limits.
 *   - Listing sites (Software Advice, SoftwareSuggest, SourceForge, SurveyLab) describe
 *     Standard / PRO / MAX tiers around $29–$35 at entry and $99–$159 at the top, metered
 *     by test results a month (about 30 on the cheapest, up to a few thousand on MAX),
 *     plus proctoring modes, camera and desktop recordings, a secure browser, up to 150
 *     test-takers per proctor in live mode, and a Microsoft Teams app with live camera
 *     monitoring. These figures contradict each other, so this page gives the shape and
 *     tells the reader to check the live pricing page.
 *
 * TestoZa claims: as verified for the Moodle guide, plus sectional timing (8 October
 * 2026) and /join/result. Not in the product, and never to be implied: certificates,
 * human grading of open-ended answers, camera or screen-recording proctoring, a secure
 * browser, a Teams app, recruitment workflows, SSO, essays, file uploads.
 */
import { ALT_RIVALS, SCHEMES, mark } from './altData';
import { TESTPORTAL_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const R = ALT_RIVALS.testportal;

const FIT_FALLBACK = `
<p>A checklist of what you run tests for. ${R.name}’s home ground: ${R.uses
    .filter((u) => u.kind === 'core')
    .map((u) => u.label.toLowerCase())
    .join('; ')}. Student examining in India: ${R.uses
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

const MARKING_FALLBACK = `
<p>One physics question — a 2 kg body moving at 3 m s⁻¹ brought to rest in 0.5 s, answer 12 N — scored two ways. Scored as points with no penalty, the model a hiring or certification test uses, a correct answer is worth its points and a wrong answer is worth nothing but costs nothing, on the way to a percentage and a pass mark. In TestoZa the same answer is worth the two numbers typed on the question card: ${SCHEMES.filter(
    (s) => s.wrong,
)
    .map((s) => `${s.full} +${mark(s.right)} with −${mark(s.wrong)} for a wrong tick`)
    .join(', ')}. A pass mark asks “is this person good enough?”. An Indian entrance paper asks “where does this candidate rank among twenty lakh?”, and the negative mark is how it separates them.</p>`;

const MOVE_FALLBACK = `
<ol class="al-list al-list--num">
${R.steps.map((s) => `<li><strong>${s.title} (${s.minutes} min)</strong>${s.detail}</li>`).join('\n')}
</ol>
<p>About ${R.steps.reduce((a, s) => a + s.minutes, 0)} minutes for a 30-question paper you already have, including reading every question once before it goes live.</p>`;

export const TESTPORTAL_ALTERNATIVE: Guide = {
    meta: TESTPORTAL_META,
    body: {
        intro: [
            html(`
<p>Testportal is a good piece of software that was built for a different room than yours.</p>
<p>Look at how it introduces itself. Its own site sorts customers into two groups, and Business comes first: human resources, training companies and departments, certification, sales and customer service, language schools. Education follows — teachers, schools, universities. The pricing link goes to business plans. The language switch offers English and Polski. The features on the front page are self-grading open-ended and choice questions, automatic grading, an AI generator, proctoring and security.</p>
<p>That is a recruitment and certification product with an education door on the side, and it is excellent at the job it was designed for: you have 300 applicants, you need to know which 30 can do arithmetic, and you need a record that stands up to an audit. Camera proctoring, a secure browser, certificates, a pass mark.</p>
<p>Now picture the room this page is written for. A coaching institute in Jaipur, 180 questions, three hours, +4 for a correct answer and −1 for a wrong one, Hindi on the left of each question and English on the right, four hundred students on their own Android phones on mobile data, and by Sunday night a rank list on the notice board and a report card going home. The marks are not a pass or a fail; they are a position among candidates, and the negative mark is the instrument that creates it.</p>
<p>Both products mark tests automatically. Almost everything else about them follows from those two different rooms. This guide walks through the differences honestly — who each is built for, what the price meter counts, where the marking gap sits, what the candidate is holding, and what comes out the other end — and ends with a plain list of what Testportal does that we do not. It is written by the team behind TestoZa, so weigh the TestoZa parts accordingly; every Testportal fact comes from its own site, or is flagged as coming from third-party listings.</p>
`),
        ],

        answer:
            'Choose by the exam you are running, not by the feature list. Testportal is built for business assessment — hiring, training, certification — with camera proctoring, a secure browser, certificates and human grading of open-ended answers, an interface in English and Polish, and plans metered by test results a month. If that is your work, keep it. If you are examining Indian students, the requirements are different: +4/−1 and partial marks per question, sections with their own clock, Hindi and bilingual papers, 400 candidates in one sitting with no per-result meter, a paper that survives a four-year-old Android on mobile data, and a result read as a batch rank list rather than a pass mark. TestoZa does that part: free to build and run tests, ₹49 for 7 days, ₹149 for 30 days or ₹799 for a year, with no cap on candidates or results. It has no certificates, no camera proctoring, no secure browser and no recruitment workflow.',

        sections: [
            {
                id: 'what-you-use',
                title: 'What are you running tests for?',
                tocLabel: 'What you use',
                kicker: 'Start here',
                blocks: [
                    html(`
<p>“Assessment” covers two trades that share a word. One decides whether a person is good enough: a hiring test, a compliance check, a certificate at the end of a course. The unit is one candidate, the output is a pass mark, and the hard part is proving the person was who they said they were.</p>
<p>The other ranks people against each other: an entrance mock, a test series, a weekly paper in a batch of ninety. The unit is the batch, the output is a position, and the hard part is marking the paper exactly as the real exam marks it so the position means something.</p>
<p>Switch on what you do, and see which trade you are in:</p>
`),
                    { type: 'widget', widget: 'alt-fit', fallbackHtml: FIT_FALLBACK },
                    html(`
<p>Three answers:</p>
<ul class="al-list">
<li><strong>Keep Testportal.</strong> If you are screening applicants, certifying trainees or keeping compliance records, it is built for you, and an exam platform for coaching institutes would be a downgrade — no certificates, no camera proctoring, no human grading of written answers.</li>
<li><strong>Keep it for the office; test students elsewhere.</strong> Common in training companies and institutes that do both. Recruitment and staff certification stay; student exams move to software that marks like the real paper.</li>
<li><strong>You are running Indian exams on a hiring tool.</strong> If everything you ticked is entrance patterns, Hindi papers, batches and rank lists, you are working around the product on every paper you set.</li>
</ul>
`),
                ],
            },
            {
                id: 'who-its-for',
                title: 'Who the product thinks you are',
                tocLabel: 'Who it is for',
                kicker: 'Assumptions',
                blocks: [
                    html(`
<p>Software carries the assumptions of the market it was built for, and those assumptions show up in small places long before they show up in a feature comparison.</p>
<h3>The vocabulary</h3>
<p>Testportal counts <em>respondents</em> and <em>test results</em>. TestoZa counts <em>candidates</em> and <em>sittings</em>, and a sitting belongs to a batch. That is not a style choice: it is the data model, and it decides what a report can tell you. A product that counts respondents will give you a list of scores. A product that counts batches will give you a rank list, a class average and the question your batch collectively failed.</p>
<h3>The language</h3>
<p>Testportal’s own site offers English and Polski. A test can of course contain Hindi text — any modern web app handles Unicode — but there is a difference between a product that stores Hindi and one built for it: Hindi typed with English letters because that is faster for a teacher, a question that carries English and Hindi together the way an NTA paper does, a Devanagari-aware exam screen, and AI that will write the Hindi side from your English material. In India, that distinction decides whether the second language is a feature or a chore.</p>
<h3>The exam calendar</h3>
<p>A product built for Indian students knows that SSC gave every section of CGL Tier 1 its own 15 minutes in 2026, that bank prelims run three sections of 20 minutes each, that JEE Advanced pays +1 per correct option but nothing if a wrong option is ticked, and that NEET is 180 questions at +4/−1. These are not configuration options you would think to ask for; they are the shape of the paper. Software that does not track that calendar leaves you to approximate it, and an approximated mock produces an approximated rank.</p>
<div class="al-note" data-icon="info"><p><strong>The test to run on any vendor.</strong> Ask them to build, during the demo, one question worth +4 with −1, one multiple-correct question with partial marks, one numerical answer accepted between 9.75 and 9.85, and one section that closes after 15 minutes and cannot be reopened. You will learn more in those four minutes than from an hour of feature lists.</p></div>
`),
                ],
            },
            {
                id: 'side-by-side',
                title: 'Testportal and TestoZa, question by question',
                tocLabel: 'Side by side',
                kicker: 'Side by side',
                blocks: [
                    html(`
<p>Five questions worth asking, with each side’s answer and what the difference costs you in practice:</p>
`),
                    { type: 'widget', widget: 'alt-compare', fallbackHtml: COMPARE_FALLBACK },
                ],
            },
            {
                id: 'marking',
                title: 'The marking gap',
                tocLabel: 'Marking',
                kicker: 'The real difference',
                blocks: [
                    html(`
<p>Testportal’s front page lists automatic grading of choice questions, self-grading open-ended questions, and an AI that writes questions from your materials. What it does not mention anywhere is negative marking, partial credit on multiple-correct questions, or sections with their own clock. That absence is consistent with the market it serves: a hiring test does not deduct marks for a wrong answer, because the question being asked is “how much does this person know?”, not “how carefully do they decide under a penalty?”.</p>
<p>Indian entrance exams ask the second question. The penalty is the point. It is what makes a candidate leave a question blank rather than guess, and learning when to leave a question blank is a substantial part of what a year of coaching teaches.</p>
<p>Answer the question below correctly, then deliberately wrongly, and watch the two models diverge:</p>
`),
                    { type: 'widget', widget: 'alt-marking', fallbackHtml: MARKING_FALLBACK },
                    html(`
<p>What that looks like in practice on a question card is two fields, <strong>Marks</strong> and <strong>Wrong</strong>, with a new question inheriting the last one’s. Around them:</p>
<ul class="al-checks">
<li><strong>Partial marks on multiple-correct questions,</strong> proportional or the JEE Advanced +1-per-correct-option rule, with the negative applied if any wrong option is ticked.</li>
<li><strong>Numerical answers as a range,</strong> so 9.8 and 9.81 can both be correct, and two-decimal answers behave as the real paper expects.</li>
<li><strong>Decimal marks,</strong> because bank papers produce marks like 1.5 and 0.857 and a platform that only takes whole numbers quietly changes your paper.</li>
<li><strong>Sections with their own clock</strong> that close themselves and cannot be reopened — the 2026 SSC Tier 1 and bank prelims pattern.</li>
<li><strong>Scored on the server,</strong> which is what lets a total be defended when a student disputes it.</li>
</ul>
<p>If your tests are pass-or-fail and nothing is deducted, none of this is worth paying for and you should not switch for it. The moment a wrong answer must cost something, it is the whole decision.</p>
`),
                ],
            },
            {
                id: 'price',
                title: 'What the price meter counts',
                tocLabel: 'Price',
                kicker: 'The arithmetic',
                blocks: [
                    html(`
<p>Testportal does not show prices on its home page; the pricing link leads to business plans, and sign-up is free with no card. Third-party listings describe Standard, PRO and MAX tiers roughly between $29 and $35 a month at the entry level and $99 to $159 at the top, metered by <strong>test results per month</strong> — in the region of 30 results on the cheapest plan, rising to a few thousand at the top, with a custom tier above that. Those figures disagree with each other, so treat them as a shape rather than a quote and check the live page.</p>
<p>The shape is what matters, because a per-result meter behaves very differently for a company and for a coaching institute.</p>
<p>A company running hiring tests generates a handful of results a week. An institute running one mock for 150 students generates 150 results in three hours, and four mocks a month is 600. The same meter that is generous for recruitment is punishing for a test series, and the effect is worse than the arithmetic: you start rationing mocks, or splitting a batch across months, which is a software decision changing your teaching calendar.</p>
<h3>Work it out per sitting</h3>
<p>Here is the honest comparison, and you can do it in two lines on paper:</p>
<ol class="al-list al-list--num">
<li><strong>Count the sittings you want in a month.</strong> Students per paper, times papers. Not the number you currently run — the number you would run if the software were not in the way.</li>
<li><strong>Divide the monthly fee by that number.</strong> Then do the same for any alternative, and add whatever an overage or a tier upgrade costs when a batch grows.</li>
</ol>
<p>For reference, the number on this side: there is no cap on results, candidates, tests or sittings. Building tests, running live exams, marking, rank lists and report cards cost nothing; paid plans are ₹49 for 7 days, ₹149 for 30 days and ₹799 for a year, billed in rupees. A mock for 400 students is one mock, and the per-sitting figure gets smaller the more you teach — which is the right direction for a meter to point.</p>
`),
                ],
            },
            {
                id: 'device',
                title: 'The candidate’s device, and what security really means there',
                tocLabel: 'The device',
                kicker: 'Exam day',
                blocks: [
                    html(`
<p>Testportal’s security story is built for an invigilated desktop test: proctoring modes, camera and desktop recordings, a secure browser, up to 150 test-takers per proctor in live mode, and a Microsoft Teams app for watching camera feeds. In an office, or a university computer lab, that is a strong answer.</p>
<p>In an Indian coaching institute, the candidate is holding a mid-range Android phone, on mobile data, in a room you do not control. Every part of the desktop answer weakens there: a secure browser that does not install on Android protects nobody, and a camera feed from 400 phones is not something a teacher can watch. So the honest design is different — fewer promises, more resilience:</p>
<ul class="al-checks">
<li><strong>Answers saved to the server every 20 seconds,</strong> so a dropped connection or a dead battery costs a minute, not a paper.</li>
<li><strong>Rejoin on another device</strong> with the same details and continue from where the paper was; the sitting is flagged as a changed device for you rather than blocked.</li>
<li><strong>Exam rules in an ordinary browser:</strong> forced full screen, tab switches counted against a limit that can submit the paper automatically, copy, paste and right-click off, back button blocked.</li>
<li><strong>A live list and a projector view,</strong> which is the invigilation that actually works for a hall: the code and a countdown on the wall, and a teacher watching who left the exam screen.</li>
<li><strong>Nothing to install,</strong> so nothing fails to install twenty minutes before the paper starts.</li>
</ul>
<p>Said plainly: no browser rule makes cheating impossible, and we do not claim otherwise. What these rules do is remove the casual version — the second tab, the copied question, the pasted answer — which is most of it in practice. If you need identity-verified, camera-recorded proctoring for a certificate that carries legal weight, Testportal is the better tool and this is one of the places where it wins outright.</p>
`),
                ],
            },
            {
                id: 'results',
                title: 'Who reads the result',
                tocLabel: 'Results',
                kicker: 'After the paper',
                blocks: [
                    html(`
<p>A hiring tool reports on a person: their score, their percentage, whether they passed, perhaps a certificate. Correct for its purpose, and not what an institute acts on.</p>
<p>An institute acts on two things. First, where a candidate sits in a batch — because that is the only honest proxy for where they will sit among the lakhs who take the real exam. Second, which question the batch got wrong, because that is Monday’s lesson.</p>
<h3>The batch view</h3>
<p>A rank list fills in as papers come in, with the class average, the highest and lowest, and averages per section where the paper has sections. It copies out as text, goes into a WhatsApp group, or downloads as Excel.</p>
<h3>The question view</h3>
<p>Per question: how many attempted it, how many got it right, how long they spent on it, and which wrong option most of them chose. A question where 60% of the batch picked the same wrong option is a misconception with an address.</p>
<h3>The documents</h3>
<p>Report cards print or save as PDF. Where the batch list holds a parent’s number, a WhatsApp message can be prepared with the marks for you to send — nothing is sent automatically. Results are released when the exam ends, as each paper arrives, or by hand after you have checked them, and candidates can look their own result up later with the code.</p>
<p>What there is not: certificates, and no amount of asking will produce one. If a certificate with a name and a seal is the deliverable your customer is paying for, that is Testportal’s column again.</p>
`),
                ],
            },
            {
                id: 'move-one-paper',
                title: 'Moving one paper across',
                tocLabel: 'Moving a paper',
                kicker: 'Try it small',
                blocks: [
                    html(`
<p>Do not move a question bank — there is no importer for another platform’s database, and pretending otherwise wastes your weekend. Move one paper, run one sitting, and judge it on the marking and the rank list:</p>
`),
                    { type: 'widget', widget: 'alt-move', fallbackHtml: MOVE_FALLBACK },
                    html(`
<p>The thing to check afterwards is narrow and decisive: take one candidate who guessed four questions and one who left four blank, and see whether the totals separate them the way the real exam would. If they do, the mock is worth running again. If they do not, no amount of analytics will fix it.</p>
`),
                ],
            },
            {
                id: 'where-testportal-wins',
                title: 'Where Testportal wins',
                tocLabel: 'Where it wins',
                kicker: 'Being straight',
                blocks: [
                    html(`
<p>If you are on this page deciding between the two, these are the reasons to stay exactly where you are. TestoZa does none of them:</p>
<ul class="al-limits">
<li><strong>Certificates.</strong> A generated, branded certificate after a passed test is a core Testportal feature and does not exist here at all.</li>
<li><strong>Open-ended answers graded by a person.</strong> Essays, short written answers, a marker’s rubric and comments. TestoZa marks automatically, which means answers must be machine-checkable — options, numbers, ranges — and there are no file uploads.</li>
<li><strong>Camera and screen proctoring, and a secure browser.</strong> Recorded sessions, live monitoring, up to 150 test-takers per proctor, a Teams app. Our answer is browser rules and a live list, which is a different and lesser promise.</li>
<li><strong>Recruitment workflows.</strong> Candidate pipelines, screening stages, hiring reports, the vocabulary and the integrations of an HR tool.</li>
<li><strong>Compliance and training records.</strong> Audit-shaped reporting for staff training and certification, which is a genuine regulatory need in many companies.</li>
<li><strong>European working languages and data expectations.</strong> An English/Polish interface and a company operating in that market, which matters if your respondents are there.</li>
</ul>
<p>And what we would claim in return, kept to the things that are checkable: marking that matches Indian exam patterns including negative marks, partial credit and sectional clocks; Hindi and bilingual papers as a first-class feature; no cap on results or candidates; AI that reads your existing PDFs, printed papers and handwritten sheets; a batch joining with a six-digit code and no accounts; and results shaped as a batch rank list with per-question analysis. Those are the six reasons an institute moves the student exams, and they are the only six we would argue for.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'What is the best Testportal alternative for a school or coaching institute in India?',
                a: 'For Indian student exams, look for marking that matches the pattern you are preparing for — negative marks per question, partial credit on multiple-correct questions, numerical answers as a range, sections with their own clock — plus Hindi or bilingual papers and no per-result cap. TestoZa is built for exactly that and is free to build and run tests on. If your tests are hiring or certification tests, Testportal is the better fit and you should keep it.',
            },
            {
                q: 'How much does Testportal cost?',
                a: 'Its home page shows no prices and the pricing link goes to business plans; sign-up is free with no card required. Third-party listings describe Standard, PRO and MAX tiers roughly between $29 and $35 a month at entry and $99 to $159 at the top, metered by test results a month — around 30 results on the cheapest plan, rising to a few thousand at the top. Those sources disagree, so check the live pricing page. The important thing is the meter: a result cap counts every student who sits every paper.',
            },
            {
                q: 'Does Testportal support negative marking and partial marks?',
                a: 'Its public feature list does not mention either, nor sections with their own clock. It lists automatic grading of choice questions, self-grading open-ended questions and an AI question generator. If your paper needs +4/−1, partial credit on multiple-correct questions or a section that closes on its own, ask before you trial it — and ask them to build one on the call.',
            },
            {
                q: 'Is there a limit on how many students can take a test?',
                a: 'In TestoZa, no: there is no cap on candidates in a sitting, on results, or on how many tests you run, and no per-candidate charge. On plans metered by test results a month, a single mock for 150 students consumes 150 results, which is the arithmetic to do before committing to a test series.',
            },
            {
                q: 'Can I run tests in Hindi or in two languages?',
                a: 'Yes. Papers can be Hindi, English, or bilingual with both languages on each question the way an NTA paper is set. The AI keeps your material’s language or writes the second language from the first, and in the builder Hindi can be typed with English letters, which is faster than a Devanagari keyboard for most teachers. Testportal’s own interface is offered in English and Polish.',
            },
            {
                q: 'Does TestoZa have camera proctoring or a secure browser?',
                a: 'No. It has exam rules that work in an ordinary browser — forced full screen, tab switches counted with a limit that can auto-submit, copy, paste and right-click off, back button blocked — plus a live list of who left the exam screen and a projector view for the hall. There is no camera recording, no screen recording and no lockdown browser. For an identity-verified, recorded test, Testportal is the right tool.',
            },
            {
                q: 'Can it generate certificates after a test?',
                a: 'No. TestoZa produces rank lists, report cards as PDF and Excel exports, but not branded certificates. If a certificate is the product your learners are paying for, keep a tool that issues them.',
            },
            {
                q: 'How do I move my existing tests over?',
                a: 'A paper at a time. Print or export the paper to PDF from wherever it lives and upload it, with the answer key as a second file; the AI reads questions, options, the key, diagrams and equations, and you check them once before going live. There is no importer for another platform’s database format, so plan to move the papers you still use rather than a whole archive.',
            },
            {
                q: 'Can students take the test on a phone?',
                a: 'Yes, and that is the device it was designed around. The exam screen is built for a small display, equations are typeset rather than images, answers save to the server every 20 seconds, and a candidate can rejoin on another device and carry on if a phone dies. Nothing has to be installed.',
            },
        ],

        closingTitle: 'Test it on one paper',
        closing: [
            html(`
<p>One paper, one sitting, and judge it on the marking:</p>
<div class="al-paths">
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Paper already a PDF?</span><span class="al-path-what">Upload it and let the AI read it</span></a>
<a class="al-path" href="/create-test" data-icon="pencil"><span class="al-path-who">Need exam-pattern marking?</span><span class="al-path-what">Build it with +4/−1, partial marks and sections</span></a>
<a class="al-path" href="/user-guide/live-exam-sessions" data-icon="key"><span class="al-path-who">A whole batch at once?</span><span class="al-path-what">See how join codes and the exam room work</span></a>
</div>
<p>Related reading: <a href="/cbt-exam-software">CBT exam software</a>, <a href="/hindi-online-test-maker">Hindi online test maker</a>, <a href="/prevent-cheating-in-online-exams">preventing cheating in online exams</a>, <a href="/best-online-test-platform">choosing an online test platform</a> and <a href="/pricing">pricing</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Testportal',
                links: [
                    { label: 'Testportal website', href: 'https://www.testportal.net/' },
                    { label: 'Testportal on Capterra', href: 'https://www.capterra.com/p/10013182/Testportal/' },
                    { label: 'Testportal on Software Advice', href: 'https://www.softwareadvice.com/exam/testportal-profile/' },
                    { label: 'Testportal on SourceForge', href: 'https://sourceforge.net/software/product/Testportal/' },
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
                    { label: 'Hindi online test maker', href: 'https://testoza.com/hindi-online-test-maker' },
                ],
            },
        ],
    },
};
