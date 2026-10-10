/**
 * testoza.com/teachmint-alternative — what Teachmint became (a hardware-led connected
 * classroom for schools), who that leaves out (the coaching institute whose students
 * have phones), and what the exam half looks like bought on its own.
 * Written for coaching institute owners, school exam cells and teachers of one batch.
 *
 * Teachmint facts (checked 10 October 2026 against teachmint.com, sources in `sources`):
 *   - The homepage leads with Teachmint X, an "AI-Powered Connected Classroom® Device":
 *     interactive flat panels (X2 at 65", 75", 86"), Vision X for device and campus
 *     admin, Share X, Click X student clickers.
 *   - Software around it: a Connected Classroom Platform covering pre-class, in-class
 *     and post-class, which "automate[s] attendance" and does "automated grading,
 *     progress reports"; EduAI with a Quiz Generator, Homework Generator, Class Recap.
 *   - Solutions menu: Schools, Higher Education, Coaching. Hero line: "Education Built
 *     for every learning environment."
 *   - No prices on the page: "Book a Demo", with an "Order Now" link to its cart site.
 *   - History: began as a mobile-first, video-first teaching app (TechCrunch covered a
 *     $16.5M raise in May 2021). Third-party listings still show per-user figures and
 *     custom-priced Basic/Advanced/Pro tiers; those are not published by Teachmint, so
 *     this page describes them as listings rather than quoting them as fact.
 *
 * TestoZa claims: as verified for the Moodle guide, plus sectional timing (8 October
 * 2026) and /join/result. Not in the product: attendance registers, fees, admissions,
 * a parent app, timetables, report-card workflows for a term, LTI or ERP integration,
 * essays, file uploads, live classes, hardware of any kind.
 */
import { ALT_RIVALS, SCHEMES, mark } from './altData';
import { TEACHMINT_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const R = ALT_RIVALS.teachmint;

const FIT_FALLBACK = `
<p>A checklist of what schools and institutes run on ${R.name}. What it is for: ${R.uses
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
<p>One physics question — a 2 kg body moving at 3 m s⁻¹ brought to rest in 0.5 s, answer 12 N — scored two ways. Plain right/wrong scoring, the default in a classroom quiz tool, gives 1 mark for the correct option and nothing off for a wrong one. In TestoZa the same answer is worth the two numbers on the question card: ${SCHEMES.filter(
    (s) => s.wrong,
)
    .map((s) => `${s.full} +${mark(s.right)} with −${mark(s.wrong)} for a wrong tick`)
    .join(', ')}. A unit test can live without that. A board or entrance mock cannot, because the habit a paper teaches is most of what the paper is for.</p>`;

const MOVE_FALLBACK = `
<ol class="al-list al-list--num">
${R.steps.map((s) => `<li><strong>${s.title} (${s.minutes} min)</strong>${s.detail}</li>`).join('\n')}
</ol>
<p>About ${R.steps.reduce((a, s) => a + s.minutes, 0)} minutes for a 30-question paper you already have, including reading every question once before it goes live.</p>`;

export const TEACHMINT_ALTERNATIVE: Guide = {
    meta: TEACHMINT_META,
    body: {
        intro: [
            html(`
<p>Teachmint arrived in 2020 as an app a teacher could run a class from: mobile-first, video-first, built for the two years when every Indian classroom was a phone. A lot of small institutes started there.</p>
<p>Open teachmint.com in October 2026 and the first thing on the page is a 65-inch interactive panel. Teachmint X is described as an “AI-Powered Connected Classroom® Device”, sold in 65, 75 and 86-inch models, with Vision X to manage those devices across campuses, clickers for students in the room, and a connected-classroom platform wrapped around the hardware — attendance automated, grading automated, an AI assistant that generates quizzes and homework. The menu offers Schools, Higher Education and Coaching. There is no price anywhere; there is a <em>Book a Demo</em> button.</p>
<p>That is not a criticism. It is a company that found its buyer: a school fitting out rooms, with a budget cycle, a procurement process and walls to drill. But if you run a coaching institute above a shop, or teach one batch of forty whose students have ₹8,000 Android phones, you are not that buyer — and the thing you were using the app for was probably much narrower. Usually it was tests.</p>
<p>This guide is about buying that narrower thing on its own: software that builds a paper, marks it the way your exam marks, runs it on the phones your students already carry, and tells you on Sunday evening which question the batch failed. It is written by the team behind TestoZa, so read the TestoZa parts as an interested party’s account; every Teachmint fact here comes from Teachmint’s own site on the date above.</p>
`),
        ],

        answer:
            'Teachmint today is a school platform built around classroom hardware — interactive panels, device management, an AI assistant — sold through a demo call with no public price. If you need attendance, fees, admissions and panels, that is an administration and infrastructure purchase and no exam tool replaces it. If what you actually need is the testing part, buy that separately: a dedicated exam platform gives you +4/−1 and partial marking per question, sections with their own clock, a six-digit join code instead of student accounts, AI that reads your existing PDFs and printed papers, and a rank list with per-question analysis the same evening. TestoZa is one: nothing to install, nothing to mount, free to build and run tests, with paid plans at ₹49 for 7 days, ₹149 for 30 days or ₹799 for a year. It has no attendance register, no fee module, no admissions, no parent app and no hardware.',

        sections: [
            {
                id: 'what-you-use',
                title: 'What are you actually running on it?',
                tocLabel: 'What you use',
                kicker: 'Start here',
                blocks: [
                    html(`
<p>A school platform and an exam platform overlap in one small place — a quiz — and that overlap is where people get stuck choosing. The way out is to separate administration from assessment, and be honest about which one you open daily.</p>
<p>Administration is a register, a receipt, an admission form, a term report card: records the institution is legally and practically obliged to keep. Assessment is a paper, a clock, a marking scheme and a mark sheet: a thing you make and use on one day. The first is a system of record. The second is a tool.</p>
`),
                    { type: 'widget', widget: 'alt-fit', fallbackHtml: FIT_FALLBACK },
                    html(`
<p>Three answers come out of it:</p>
<ul class="al-list">
<li><strong>Keep the school platform.</strong> If attendance, fees, admissions and term records run on it, that is an ERP and you should compare it with other ERPs. The exam question is separate and can wait.</li>
<li><strong>Keep the records. Move the exams.</strong> The usual answer for a school with an exam cell, or an institute that also runs entrance mocks. Registers and fees stay; papers move to software that marks like the exam you are preparing students for, and the totals come back as a spreadsheet.</li>
<li><strong>You are using a school system for its quiz.</strong> Common for coaching institutes that signed up in the app era. You do not need panels, admissions or a parent app to set a test.</li>
</ul>
`),
                ],
            },
            {
                id: 'what-it-is-now',
                title: 'What you are buying in 2026',
                tocLabel: 'What it is now',
                kicker: 'The product today',
                blocks: [
                    html(`
<p>It is worth being specific, because the Teachmint many people remember and the Teachmint on sale today are different purchases.</p>
<h3>The hardware is the headline</h3>
<p>Teachmint X is an interactive flat panel in three sizes, pitched as a connected classroom device. Around it sit Vision X, for managing devices and campuses, Share X and Click X clickers for the students in the room. This is a fit-out: a room, a wall, a budget line, an installation date.</p>
<h3>The software assumes that room</h3>
<p>The connected-classroom platform is organised around a lesson — before, during and after — with automated attendance and automated grading and progress reports. EduAI generates quizzes, homework and a recap of the class. Every one of those features is better when there is a panel at the front and a roll of enrolled students on file.</p>
<h3>The price is a conversation</h3>
<p>Nothing on the page carries a figure; the call to action is <em>Book a Demo</em>, with an order link to a cart site for the devices. Third-party listing sites still show old per-user figures and custom-priced Basic, Advanced and Pro tiers, but Teachmint does not publish those, so treat them as listings rather than prices.</p>
<div class="al-note" data-icon="info"><p><strong>What this means for a small institute.</strong> A demo call for a hardware-led platform is a long path to “I want to set a test on Sunday”. If exams are the job, the shortest honest route is software that publishes its price and lets you build a paper before you speak to anyone.</p></div>
`),
                ],
            },
            {
                id: 'side-by-side',
                title: 'Teachmint and a test platform, question by question',
                tocLabel: 'Side by side',
                kicker: 'Side by side',
                blocks: [
                    html(`
<p>Not feature checklists — the questions a teacher or an institute owner actually asks, with what each side answers and what it costs you in practice:</p>
`),
                    { type: 'widget', widget: 'alt-compare', fallbackHtml: COMPARE_FALLBACK },
                ],
            },
            {
                id: 'device',
                title: 'The device question: a panel at the front, or the phone in their pocket?',
                tocLabel: 'The device',
                kicker: 'Where the exam happens',
                blocks: [
                    html(`
<p>Classroom hardware improves teaching. It does nothing for an exam, because an exam happens on one device per candidate, and in India that device is overwhelmingly a mid-range Android phone on mobile data. Software built for phones first behaves differently from software that was made for a laptop and shrunk:</p>
<ul class="al-checks">
<li><strong>Answers are saved to the server every 20 seconds.</strong> A battery dying at question 44 costs a candidate a minute, not a paper.</li>
<li><strong>A candidate can rejoin on another device</strong> with the same details and continue exactly where they were — the sitting is marked “changed device” for you, not blocked.</li>
<li><strong>The exam screen fits a small screen.</strong> Question palette, Mark for review, Save &amp; Next, section tabs, and a text-size control for a student reading a long passage on a 5-inch display.</li>
<li><strong>Equations are typeset, not pictures.</strong> Integrals and chemical equations reflow and stay sharp instead of becoming a blurry crop someone has to pinch-zoom.</li>
<li><strong>Nothing to install.</strong> No app, no secure browser, no store download before an exam — which also means nothing that fails to install twenty minutes before you start.</li>
<li><strong>Exam rules work in an ordinary browser.</strong> Forced full screen, tab switches counted with a limit that can submit the paper, copy, paste and right-click off, back button blocked. No browser rule makes cheating impossible, and anybody who tells you otherwise is selling something.</li>
</ul>
<p>The practical test for any platform you are considering is embarrassingly simple: borrow a student’s phone — not your own — turn off Wi-Fi, and sit five questions of a real paper on it. Most buying mistakes in this category would be caught in those five minutes.</p>
`),
                ],
            },
            {
                id: 'marking',
                title: 'Automated grading is not the same as your exam’s marking',
                tocLabel: 'Marking',
                kicker: 'The real difference',
                blocks: [
                    html(`
<p>“Automated grading” means a machine checked the answers. It says nothing about the scheme it checked them under, and the scheme is where school quiz tools and exam software diverge.</p>
<p>A unit test is usually one mark per question, no penalty — and for that, almost any tool is fine. An entrance mock is not: JEE Main and NEET take a mark off for a wrong answer against +4 for a right one, SSC Tier 1 is +2 and −0.5 with each section on its own 15-minute clock since 2026, bank prelims take a quarter of a mark and give every section its own 20 minutes. Those rules exist to make guessing expensive, and a mock that does not reproduce them trains the opposite instinct.</p>
<p>Answer the question below correctly, then deliberately get it wrong, and watch the two numbers move apart:</p>
`),
                    { type: 'widget', widget: 'alt-marking', fallbackHtml: MARKING_FALLBACK },
                    html(`
<p>In TestoZa the scheme is two fields on the question card — <strong>Marks</strong> and <strong>Wrong</strong> — and a new question inherits the previous one’s, so a 90-question paper is set once. Multiple-correct questions take proportional partial marks or the JEE Advanced +1-per-option rule; numerical answers are accepted between a minimum and a maximum; sections can hold their own clock and close themselves. Scoring runs on the server, which is what lets a result be defended when a parent asks.</p>
<p>If your school only ever sets +1/0 papers, none of this matters and you should not pay for it. The moment a student in your batch is sitting JEE, NEET, CUET, SSC or a bank exam, it is the whole ball game.</p>
`),
                ],
            },
            {
                id: 'exam-day',
                title: 'One period, one code, no accounts',
                tocLabel: 'Exam day',
                kicker: 'Running it',
                blocks: [
                    html(`
<p>A school system runs a test through accounts it already holds: the student is enrolled, the parent app is installed, the office keeps the roll tidy. That works, until a student has forgotten a password, or a new admission has not been added, or the test is for a batch that does not map to a class and a section.</p>
<p>A join code sidesteps the whole structure. You give the paper to a batch as a live exam and get a six-digit code, a QR code and a projector view:</p>
<ol class="al-list al-list--num">
<li><strong>Write the code on the board</strong> or show the projector view. Candidates open <a href="/join">testoza.com/join</a>, type it, and check in by name or roll number — optionally with a four-digit PIN so nobody signs in as somebody else.</li>
<li><strong>Watch the lobby fill.</strong> You know who is absent before the paper starts.</li>
<li><strong>Press Start</strong> when the room is settled, or set a time. Late arrivals can be let in and still get their full duration, up to the closing time you set.</li>
<li><strong>Read the live list</strong> while they write: minutes left, questions answered, and flags for no signal, a changed device, or leaving the exam screen.</li>
<li><strong>Give time where it is needed</strong> — +5 or +10 minutes for one candidate, or 5 to 30 for everyone still writing.</li>
<li><strong>End the exam.</strong> Papers submit themselves when time runs out; ending it submits whatever is saved for anyone still writing. The rank list is there before the bell.</li>
</ol>
<p>Everything in that list is free. Candidates never make an account, and nothing is installed on anybody’s phone.</p>
`),
                ],
            },
            {
                id: 'results',
                title: 'A result a teacher can act on, and one a parent can read',
                tocLabel: 'Results',
                kicker: 'After the paper',
                blocks: [
                    html(`
<p>School platforms are built to produce a progress report: a term, a subject, a grade, a comment. That is the right document for a parent meeting and the wrong one for Monday’s lesson plan. One paper should give you both.</p>
<h3>For the teacher</h3>
<p>A rank list that fills as papers come in, with the class average, highest and lowest, and the average per section. Then the numbers that change teaching: how many attempted each question, how many got it right, how long they spent, and which wrong option the batch fell for. When two-thirds of a class picks the same wrong option, you have found either a misconception or a badly worded question — and both are worth five minutes on Monday.</p>
<h3>For the parent</h3>
<p>Report cards that print or save as PDF, and, if you keep parents’ numbers in the batch list, a WhatsApp message prepared with the marks in it. You press send. Nothing goes out automatically, and the numbers are not used for anything else.</p>
<h3>For the student</h3>
<p>Results released when the exam ends, immediately per paper, or by hand after you have looked. A candidate can look their own result up later with the code, and the answer key stays hidden until you release it.</p>
<h3>For your records</h3>
<p>Excel, for the marks that have to land in your own register or report-card workflow. There is no ERP integration, so this hand-off is a download and a paste, and it is better to know that now than to discover it in March.</p>
`),
                ],
            },
            {
                id: 'move-one-paper',
                title: 'Moving one test across, in one free period',
                tocLabel: 'Moving a paper',
                kicker: 'Try it small',
                blocks: [
                    html(`
<p>Nothing needs migrating. Take last term’s unit test — a paper you already set and marked by hand — and run it again as a live exam. The job, with honest minutes:</p>
`),
                    { type: 'widget', widget: 'alt-move', fallbackHtml: MOVE_FALLBACK },
                    html(`
<p>Two comparisons to make afterwards. How long the marking took you (it should be zero), and whether the per-question numbers told you something you did not already know. If both land, do the same next week with a paper that counts. If neither does, you have lost twenty minutes and learned something about your own process.</p>
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
<p>TestoZa is narrow on purpose. Here is what it does not do, so you can stop reading if one of these is why you are on a school platform:</p>
<ul class="al-limits">
<li><strong>No hardware.</strong> No panels, no clickers, no device management. It is a website.</li>
<li><strong>No attendance register.</strong> A sitting records who wrote the paper; it is not a daily attendance system, and it will not produce a monthly register.</li>
<li><strong>No fees, admissions or timetables.</strong> No receipts, no instalments, no enquiry pipeline, no class scheduling.</li>
<li><strong>No parent app.</strong> Parents get a printed or PDF report card, or a WhatsApp message you send. There is no portal for them to log into.</li>
<li><strong>No term gradebook.</strong> Marks are per paper. Adding up a term, weighting internals and printing a final report card is a school ERP’s job.</li>
<li><strong>No lessons or live classes.</strong> No video, no recordings, no course content.</li>
<li><strong>No essays or file uploads.</strong> Marking is automatic, so answers must be machine-checkable: options, numbers, ranges.</li>
<li><strong>No LTI or ERP integration.</strong> The bridge is an Excel export.</li>
</ul>
<p>For a school, the arrangement that works is usually: keep the ERP for records, use exam software for the papers where marking and exam-pattern practice matter, and move the totals across once a term. For a coaching institute whose students are preparing for an entrance exam, the exam software is doing the heavy lifting, and the register fits in a spreadsheet. Either way, you are choosing two narrow tools over one wide one, and that is a defensible choice — not a compromise.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'What is the best Teachmint alternative for coaching institutes?',
                a: 'It depends what you used Teachmint for. If it was classroom teaching with panels, attendance and school records, you are comparing school platforms and ERPs. If it was tests — weekly papers, unit tests, entrance mocks — a dedicated exam platform is a closer fit, because it gives you exam-pattern marking, sections with their own clock, join codes instead of student accounts and per-question analysis. TestoZa is one, and it costs ₹799 a year at most.',
            },
            {
                q: 'How much does Teachmint cost?',
                a: 'Teachmint does not publish prices on its website; the call to action is a demo booking, with an order link to its cart site for the Teachmint X devices. Third-party listing sites show old per-user figures and custom-priced tiers, but those are not Teachmint’s own numbers. For a current figure — especially for hardware — you have to take the demo call.',
            },
            {
                q: 'Is Teachmint still a mobile teaching app?',
                a: 'Its public positioning has moved. As of October 2026, teachmint.com leads with Teachmint X, an AI-powered connected classroom device sold in 65, 75 and 86-inch panels, with device management for campuses, clickers, and a platform around the classroom. The software still covers attendance, grading and progress reports, and EduAI generates quizzes and homework, but the hardware is the headline. If you joined for the phone-first app, check that what you need is still the main product.',
            },
            {
                q: 'Do I need any hardware or an app to use TestoZa?',
                a: 'No. It runs in the browser a student already has. For a live exam, candidates open testoza.com/join, type a six-digit code and check in by name or roll number. Answers save to the server every 20 seconds, and if a phone dies they can rejoin on another device and carry on.',
            },
            {
                q: 'Can TestoZa handle a school’s attendance, fees and report cards?',
                a: 'No, and it does not try to. There is no attendance register, no fee collection, no admissions and no term gradebook. It builds papers, runs exams, marks them and reports on them. Keep your school system for records and let the exams live outside it — the marks come across as an Excel download.',
            },
            {
                q: 'Does it support +4/−1 marking and sectional timing?',
                a: 'Yes. Marks and Wrong are two fields on every question card, so +4/−1, +2/−0.5 and +1/−0.25 are typed in directly. Multiple-correct questions can give proportional partial marks or the JEE Advanced +1-per-option rule, numerical answers are accepted as a range, and sections can each have their own clock and close on their own, as SSC Tier 1 and bank prelims papers do.',
            },
            {
                q: 'Can I reuse my existing question papers?',
                a: 'Yes, a paper at a time. Upload a PDF or photograph the printed or handwritten sheet and the AI reads questions, options, the answer key, diagrams and equations. You read the questions once to fix anything it misread — about eight minutes for thirty questions — and the paper is live. There is no bulk importer for another platform’s database.',
            },
            {
                q: 'Will it work on a four-year-old Android phone on mobile data?',
                a: 'That is the device it was designed for. The exam screen is built for a small display, equations are typeset rather than images, answers save every 20 seconds so a dropped connection does not lose work, and there is nothing to install. The honest test before you commit is to sit five questions on a student’s phone with Wi-Fi off.',
            },
            {
                q: 'Can students take the test in Hindi?',
                a: 'Yes. Papers can be Hindi, English or bilingual with both languages on each question. The AI keeps your material’s language or writes the other side for you, and in the builder Hindi can be typed with English letters.',
            },
        ],

        closingTitle: 'Try it on one test this week',
        closing: [
            html(`
<p>No demo call, no installation, no procurement:</p>
<div class="al-paths">
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Have last term’s paper?</span><span class="al-path-what">Upload it and let the AI read it</span></a>
<a class="al-path" href="/create-test" data-icon="pencil"><span class="al-path-who">Setting a new unit test?</span><span class="al-path-what">Build it with marks, sections and a clock</span></a>
<a class="al-path" href="/user-guide/live-exam-sessions" data-icon="key"><span class="al-path-who">Running it in one period?</span><span class="al-path-what">See how the join code and exam room work</span></a>
</div>
<p>Related reading: <a href="/cbt-exam-software">CBT exam software</a>, <a href="/how-to-conduct-online-exam">how to conduct an online exam</a>, <a href="/best-online-test-platform">choosing an online test platform</a>, <a href="/ai-test-generator">the AI test generator</a> and <a href="/pricing">pricing</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Teachmint',
                links: [
                    { label: 'Teachmint website', href: 'https://www.teachmint.com/' },
                    { label: 'Teachmint on Capterra', href: 'https://www.capterra.ca/software/163105/teachmint' },
                    { label: 'Teachmint on GetApp', href: 'https://www.getapp.com/education-childcare-software/a/teachmint/' },
                    { label: 'TechCrunch, 2021 funding round', href: 'https://techcrunch.com/2021/05/04/indian-online-teaching-platform-teachmint-raises-16-5-million/' },
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
