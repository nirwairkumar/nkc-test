/**
 * testoza.com/cbt-exam-software — what CBT (computer-based test) exam software has
 * to do, how to run a CBT for a batch, and where TestoZa fits. Written for
 * coaching institutes, schools and teachers.
 *
 * Every product claim was checked against the code on 2026-09-28:
 *   - Exam screen: src/pages/TestPage.tsx — Standard Mode ("Traditional JEE / NEET /
 *     Government exam format with right-side question palette") is the default
 *     (settings.exam_interface_mode 'nta'); Modern Mode ('corporate') is set in
 *     TestSettingsPanel (paid). Palette legend: Not Visited, Not Answered, Answered,
 *     Review, Ans & Review. Buttons: Back, Clear, Review, Ans & Review, Save & Next.
 *     VirtualNumericPad on numerical questions; font size 12–32 px; optional
 *     ScientificCalculator (test.has_scientific_calculator, set in TestBuilder).
 *   - Violations: warn only / limit / strict auto-submit (TestPage handleViolation).
 *   - Time up: answering locks and a non-dismissible "Time's Up!" dialog asks the
 *     student to submit (it does not submit by itself).
 *   - Progress saved in localStorage; signed-in students get a resume prompt.
 *   - Scoring: backend/app/services/scoring.py — server-side; marks precedence
 *     question > section > test > 4/−1; fractions like "1/3"; numerical answers are
 *     a min–max range; multi-correct partial credit is proportional or JEE Advanced's
 *     +1 per option (per question, since 2026-10-08), any wrong
 *     option costs the negative mark; section attempt control hard / soft (best N
 *     or first N).
 *   - Results: show_results_immediate false → "submitted" page; attempts appear in
 *     history once visibility is switched on. Rank list in FullTestAnalysisPage.
 *     Excel export and branding are paid. Combined tests link two papers with a
 *     break (default 30 minutes).
 *   - NOT in the product: per-section timers, server-side time validation
 *     (strict_timer is stored but not enforced), QR codes. Don't claim them.
 * Exam facts come from official notices and exam-pattern pages (see `sources`).
 */
import { CBT_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const EXAM_DAY_FALLBACK = `
<ol>
<li><strong>The day before: the paper is ready.</strong> Build it from a PDF or photos with the AI test generator, or upload a whole paper with sections and solutions as a JSON file. Open it with View to check it the way students will see it.</li>
<li><strong>An hour before: settings.</strong> Duration and the calculator; on a paid plan, the full-screen rule, tab-switch limit, start form, exam window and whether results show straight away.</li>
<li><strong>Go live.</strong> Click Conduct. The test gets its own exam link, leaves public listings, and only you see the results.</li>
<li><strong>During the exam.</strong> Progress is kept on each student's device, signed-in students can resume after a refresh, a small indicator shows connection drops, and warnings are logged.</li>
<li><strong>Time's up.</strong> Answering locks and the student submits.</li>
<li><strong>Results.</strong> Scores are calculated on the server; students see their analysis at once or a "submitted" screen if you hold results; you get the rank list and breakdowns.</li>
</ol>`;

export const CBT_EXAM_SOFTWARE: Guide = {
    meta: CBT_META,
    body: {
        intro: [
            html(`
<p>For years the hardest part of an entrance exam was the paper. For more and more students it's now the screen. JEE Main, CUET, GATE and the SSC exams are already computer-based tests, and in May 2026 the National Testing Agency told the Supreme Court that NEET-UG will follow from 2027.</p>
<p>A CBT changes more than the medium. Students who are quick with a pencil often lose minutes the first time they meet a question palette, an on-screen keypad and a clock in the corner. The fix is boring and reliable: practise on the same kind of screen, under the same rules, until the interface disappears. That's the job of CBT exam software, and it's what this guide is about.</p>
`),
        ],

        answer:
            'CBT exam software runs a test on screens the way NTA, GATE and SSC exams do: one question at a time, a colour-coded question palette, a countdown, an on-screen keypad for numerical answers, and marking that follows the exam’s rules exactly. TestoZa does this in any browser, phones included. Every test opens in an NTA-style screen by default, marks can be set per question (fractions like 1/3 included), numerical answers can accept a range, a scientific calculator can be switched on, and scores are calculated on the server. Building tests and running live exams is free; exam-security rules, scheduling, branding and Excel export come with paid plans.',

        sections: [
            {
                id: 'what-is-cbt',
                title: 'What a CBT is, and which exams use one',
                tocLabel: 'What a CBT is',
                kicker: 'The basics',
                blocks: [
                    html(`
<p>A computer-based test puts the question paper on a screen. The candidate reads one question at a time, answers with a click or the on-screen keypad, and the software keeps the time and records every response. There is no OMR sheet, so there are no stray pencil marks, no half-filled bubbles and no wait for a scanner.</p>
`),
                    {
                        type: 'widget',
                        widget: 'omr-to-cbt',
                        fallbackHtml:
                            '<p>On paper, a candidate darkens OMR bubbles and the sheet is scanned later. In a CBT, each answer is saved as it is given, the question palette shows what is answered, and marks can be calculated the moment the paper is submitted.</p>',
                    },
                    html(`
<p>Here's where the big exams stand as of September 2026:</p>
<ul class="gd-exams">
<li><strong>JEE Main</strong> <span class="gd-chip">CBT</span> Run by NTA. Each subject has 20 multiple-choice and 5 numerical questions, all compulsory; a correct answer earns 4 marks and a wrong multiple-choice answer costs 1.</li>
<li><strong>CUET UG</strong> <span class="gd-chip">CBT</span> Computer-based only, with +5 for a correct answer and −1 for a wrong one.</li>
<li><strong>GATE</strong> <span class="gd-chip">CBT</span> A virtual scientific calculator on screen and numerical answers typed on a virtual keypad. Wrong MCQs lose 1/3 or 2/3 of a mark; multi-select and numerical questions have no negative marking.</li>
<li><strong>SSC CGL Tier 1</strong> <span class="gd-chip">CBT</span> 100 questions for 200 marks in 60 minutes, with half a mark off for each wrong answer.</li>
<li><strong>NEET-UG</strong> <span class="gd-chip gd-chip--soon">CBT from 2027</span> 180 compulsory questions marked +4 and −1. Still on OMR sheets in 2026, moving to computers from 2027 according to NTA.</li>
</ul>
<p>Patterns change, sometimes between sessions of the same year, so treat this as a snapshot and check the official notice before you build a paper around it.</p>
`),
                ],
            },
            {
                id: 'the-screen',
                title: 'The CBT screen, piece by piece',
                tocLabel: 'The screen',
                kicker: 'Interface',
                blocks: [
                    html(`
<p>NTA-style exams share a handful of parts, laid out in roughly the same places. Good CBT software copies them closely, because muscle memory is the whole point of practising.</p>
<ol class="gd-criteria">
<li><strong>The question palette.</strong> A grid of numbered buttons beside the question. A plain box means not visited, red means seen but not answered, green means answered, purple means marked for review, and purple with a green dot means answered and marked. That last state matters: in NTA exams an answer that is saved and marked for review is still evaluated, while a question that is only marked is not.</li>
<li><strong>Buttons to move and flag.</strong> Save &amp; Next to go forward, a way to mark for review with or without an answer, and a button to clear a response you regret.</li>
<li><strong>An on-screen keypad.</strong> JEE numericals and GATE numerical-answer questions are typed on a number pad on the screen.</li>
<li><strong>A calculator, when the exam allows one.</strong> GATE gives candidates a virtual scientific calculator. Most other exams don't.</li>
<li><strong>Sections and one clock.</strong> Subject tabs along the top and a countdown for the whole paper.</li>
</ol>
<p>TestoZa's exam screen follows this layout. Every test opens in what the settings call Standard Mode, the "traditional JEE / NEET / government exam format with right-side question palette". It has the same five palette states, buttons labelled Save &amp; Next, Review, Ans &amp; Review and Clear, a virtual numeric keypad on numerical questions, subject sections, and an A−/A+ control for students who find small text hard to read. You can switch on a scientific calculator for any test. On a paid plan there's also a cleaner Modern Mode for school or company tests that don't need to look like NTA.</p>
<p>If your students have never used a palette, our <a href="/create-mock-test-online">mock test guide</a> has an interactive one they can click through before their first exam.</p>
`),
                ],
            },
            {
                id: 'habits',
                title: 'What students practise besides the questions',
                tocLabel: 'Screen habits',
                kicker: 'For your students',
                blocks: [
                    html(`
<p>Most of the marks a student gains from CBT practice have nothing to do with physics or grammar. They come from habits that only form on a screen, and they're worth teaching on purpose.</p>
<ul class="gd-habits">
<li><strong>Two passes, not one.</strong> Answer what you're sure of, mark the rest for review and keep moving. The palette turns the second pass into a to-do list instead of a scroll through every question.</li>
<li><strong>Keypad fluency.</strong> Typing −2.5 with a mouse on an on-screen pad is slower than it sounds. Ten numericals are enough practice to stop it costing time.</li>
<li><strong>Rough work without losing your place.</strong> The question is on the screen and the working is on paper. Students who note the question number beside their working stop re-reading questions.</li>
<li><strong>Reading the clock.</strong> A countdown in the corner feels different from a wall clock. Set a checkpoint, for example a third of the paper done by the first hour, and look at the clock only at checkpoints.</li>
<li><strong>A last review round.</strong> Keep the final minutes for the purple squares. The rule about "answered and marked" means a saved answer counts even if the flag is never removed.</li>
</ul>
<p>Teachers can help by running at least a few full-length papers at the same time of day as the real exam, on the same kind of screen, and by going through the palette with the class afterwards, not just the answers.</p>
`),
                ],
            },
            {
                id: 'marking',
                title: 'Marking schemes: where most CBT software slips',
                tocLabel: 'Marking',
                kicker: 'Getting the numbers right',
                blocks: [
                    html(`
<p>An exam screen that looks right but marks wrong is worse than no screen at all, because students trust the number at the end. The details differ from exam to exam: JEE Main and NEET take one mark off for a wrong answer, CUET gives five for a right one, SSC takes off half a mark, and GATE takes a third or two thirds on MCQs and nothing on the rest. Pick an exam below and move the counts to see how quickly wrong answers add up.</p>
`),
                    {
                        type: 'widget',
                        widget: 'marking-lab',
                        fallbackHtml:
                            '<p>Example: in a +4/−1 paper, 50 correct and 12 wrong answers score 50 × 4 − 12 × 1 = 188. The 12 wrong answers cost 12 marks, which is three questions’ worth of work.</p>',
                    },
                    html(`
<p>This is how TestoZa handles marking:</p>
<ul class="gd-checks">
<li><strong>Marks at three levels.</strong> Set a default for the whole test, override it for a section, and override that again for a single question.</li>
<li><strong>Fractions work.</strong> Type 1/3 or 2/3 as a negative mark and GATE-style MCQs score exactly.</li>
<li><strong>Numerical answers can be a range.</strong> Accept anything from 9.8 to 9.9, so a rounding difference doesn't cost a student the question.</li>
<li><strong>Multi-correct questions give partial credit.</strong> Picking some of the right options earns a share of the marks; picking any wrong option costs the negative mark.</li>
<li><strong>Section rules.</strong> "Attempt any 5 of these 10" works in two ways: stop students at the limit, or let them answer more and count their best five (or their first five).</li>
</ul>
<p>Scores are worked out on our server from the saved answers, not in the student's browser, so nobody can edit their marks on the way in. One honest caveat: partial credit on multi-correct questions is either proportional (the default) or JEE Advanced’s one mark per correct option, and not every exam works either way. GATE, for example, gives nothing for a partly correct multi-select answer. If your exam is all-or-nothing, tell your students how TestoZa's rule differs, or avoid multi-correct questions in that paper.</p>
`),
                ],
            },
            {
                id: 'exam-day',
                title: 'Running a CBT for a whole batch',
                tocLabel: 'Exam day',
                kicker: 'From the teacher’s side',
                blocks: [
                    html(`
<p>Here's what a real exam looks like on TestoZa, from the night before to the rank list. Drag the slider, or swipe the cards, to move through the day.</p>
`),
                    { type: 'widget', widget: 'exam-day', fallbackHtml: EXAM_DAY_FALLBACK },
                    html(`
<p>A few things worth knowing before your first one. If your question bank already lives in files, the <a href="/user-guide/bulk-test-upload">bulk upload guide</a> explains the JSON format for a full paper with sections and solutions, and the <a href="/user-guide/ai-prompt-guide">AI prompts page</a> gives you prompts that turn a PDF into that format. The <a href="/user-guide/conduct-exam">conduct-exam guide</a> walks through going live with screenshots.</p>
<p>For exams with two papers on the same day, a combined test links two papers with a timed break between them (30 minutes unless you change it), so students feel the gap as well as the papers. And if you'd rather check answers with the class before anyone sees a score, you can hold results: students see a "submitted" screen, and their analysis appears once you switch results on.</p>
`),
                ],
            },
            {
                id: 'lab-or-home',
                title: 'Computer lab or students’ own phones?',
                tocLabel: 'Lab or home',
                kicker: 'Where it happens',
                blocks: [
                    html(`
<p>A CBT doesn't need a test centre. It needs a screen, a browser and a connection, which gives you two ways to run one. Most institutes end up using both.</p>
<div class="gd-tools">
<article class="gd-tool" data-mark="▣" data-tone="blue"><h3>In your computer lab</h3>
<p>The closest thing to the real exam: a desktop screen, a mouse, and an invigilator in the room. Use it for full-length mocks. Before the first one, open a test on every machine in the browser you'll use, check that the palette fits on screen, and try full-screen mode.</p></article>
<article class="gd-tool" data-mark="◧" data-tone="violet"><h3>On students’ phones</h3>
<p>No lab and no travel, so a weekly chapter test fits around school. Turn on the exam rules for fairness, but be realistic: a browser can't see a second phone on the desk. At home, a test is partly on the honour system however strict the settings.</p></article>
<article class="gd-tool" data-mark="↻" data-tone="orange"><h3>A rhythm that works</h3>
<p>Short chapter tests at home every week, and a full-length paper in the lab once a month, under exam conditions and at exam time. Students get the volume of practice from the first and the pressure from the second.</p></article>
</div>
`),
                ],
            },
            {
                id: 'checklist',
                title: 'Eight questions to ask any CBT exam software',
                tocLabel: 'Checklist',
                kicker: 'Before you commit',
                blocks: [
                    html(`
<ol class="gd-checks">
<li>Does the screen match the exam your students will sit, down to the palette colours and buttons?</li>
<li>Can it mark exactly your scheme, including fractions and per-question overrides?</li>
<li>Can a numerical answer accept a range?</li>
<li>Is there an on-screen keypad and, if your exam has one, a calculator?</li>
<li>What happens when a student's connection drops for a minute?</li>
<li>Are scores calculated on the server, and how soon do results appear?</li>
<li>Can you import a full paper with sections and solutions, or must someone type it in?</li>
<li>What does it cost for a whole exam season, not just for one month?</li>
</ol>
<p>Then run a sample paper with ten students before you commit. It takes one afternoon and tells you more than any sales demo.</p>
`),
                ],
            },
            {
                id: 'limits',
                title: 'Where TestoZa isn’t the right tool (yet)',
                tocLabel: 'Honest limits',
                kicker: 'Worth knowing',
                blocks: [
                    html(`
<ul class="gd-limits">
<li><strong>No separate section timers.</strong> A paper runs on one clock. If your exam locks each section on its own timer, as SSC CGL now does, you can't reproduce that exactly yet.</li>
<li><strong>A browser isn't a test centre.</strong> Full-screen and tab-switch rules make cheating harder, not impossible. For high-stakes papers, use a supervised lab.</li>
<li><strong>Time's up needs a tap.</strong> When the clock ends, answers lock, but the student still confirms the submission.</li>
<li><strong>No all-or-nothing multi-correct marking.</strong> Partial credit is proportional or JEE Advanced’s +1 per option; see the marking section above if your exam is all-or-nothing.</li>
<li><strong>The exam-security rules are paid.</strong> Full screen, tab-switch limits, start forms and scheduling come with the weekly, monthly or yearly plans on the <a href="/pricing">pricing page</a>.</li>
</ul>
<p>We'd rather you knew these before you run an exam than found them out during one.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'What is CBT exam software?',
                a: 'It is software that runs a test on a computer or phone screen instead of paper. It shows questions one at a time with a question palette and a countdown, records answers as the candidate goes, and calculates marks by the exam’s rules. JEE Main, CUET, GATE and SSC CGL are all computer-based tests.',
            },
            {
                q: 'Is TestoZa free for conducting CBT exams?',
                a: 'Yes. You can create tests, use the AI generator, run live exams with their own link and see results for free. Paid weekly, monthly and yearly plans add exam-security rules (full screen, tab-switch limits, copy-paste block), scheduling, start forms, institute branding and Excel export.',
            },
            {
                q: 'Does the TestoZa exam screen look like the NTA CBT interface?',
                a: 'Yes. By default every test uses Standard Mode, a JEE, NEET and government-exam layout with a question palette on the right, the five palette states, Save & Next, Review, Ans & Review and Clear buttons, and a virtual keypad for numerical questions.',
            },
            {
                q: 'Can students take a CBT on a mobile phone?',
                a: 'Yes. Tests open in any modern browser on phones, tablets and computers, with nothing to install. For full-length mocks, a computer lab gives the experience closest to the real exam.',
            },
            {
                q: 'Can I use JEE, NEET, CUET, SSC or GATE marking schemes?',
                a: 'Yes. Marks and negative marks can be set for the whole test, per section or per question, and fractions such as 1/3 are accepted, so +4/−1, +5/−1, +2/−0.5 and GATE-style −1/3 all work. Numerical answers can accept a range.',
            },
            {
                q: 'Does TestoZa have a scientific calculator like GATE?',
                a: 'Yes. You can switch on a scientific calculator for any test, and students open it from the exam screen.',
            },
            {
                q: 'What happens if a student’s internet disconnects during a CBT?',
                a: 'Progress is kept on the student’s device and a connection indicator shows when the network drops and returns. Signed-in students who refresh or reopen the test are offered the chance to resume where they left off.',
            },
            {
                q: 'Can I hold results until I am ready to publish them?',
                a: 'Yes, on a paid plan. Students then see a “submitted” screen instead of their analysis, and their results appear once you switch result visibility back on.',
            },
            {
                q: 'Can I run a two-paper exam with a break in between?',
                a: 'Yes. A combined test links two papers with a timed break between them. The break is 30 minutes unless you change it.',
            },
        ],

        closingTitle: 'Run your first CBT this week',
        closing: [
            html(`
<p>Start from whatever you already have:</p>
<div class="gd-paths">
<a class="gd-path" href="/generate-with-ai"><span class="gd-path-who">Have a PDF or an old paper?</span><span class="gd-path-what">Turn it into a CBT paper with AI</span></a>
<a class="gd-path" href="/user-guide/bulk-test-upload"><span class="gd-path-who">Have a question bank?</span><span class="gd-path-what">Upload a full paper with sections</span></a>
<a class="gd-path" href="/user-guide/conduct-exam"><span class="gd-path-who">Paper ready?</span><span class="gd-path-what">Run it as a live exam for your batch</span></a>
</div>
<p>Related reading: <a href="/online-exam-software">online exam software</a>, <a href="/online-proctoring-software">exam security on TestoZa</a>, <a href="/online-test-for-coaching">TestoZa for coaching institutes</a>, <a href="/best-online-test-platform">how to choose an online test platform</a> and <a href="/pricing">pricing</a>.</p>
`),
        ],

        sources: [
            {
                label: 'National Testing Agency',
                links: [
                    { label: 'About computer-based tests (PDF)', href: 'https://www.nta.ac.in/Download/AboutCBT.pdf' },
                    { label: 'JEE Main', href: 'https://jeemain.nta.nic.in/' },
                    { label: 'CUET UG', href: 'https://cuet.nta.nic.in/' },
                ],
            },
            {
                label: 'NEET-UG moving to CBT',
                links: [
                    {
                        label: 'Business Standard',
                        href: 'https://www.business-standard.com/amp/education/news/neet-ug-to-be-conducted-in-cbt-mode-from-2027-nta-to-supreme-court-126052901500_1.html',
                    },
                    {
                        label: 'The Tribune',
                        href: 'https://www.tribuneindia.com/news/india/neet-ug-to-shift-to-computer-based-test-mode-from-2027-national-testing-agency-tells-apex-court/',
                    },
                ],
            },
            {
                label: 'Exam patterns',
                links: [
                    { label: 'JEE Main marking', href: 'https://engineering.careers360.com/articles/jee-main-marking-scheme' },
                    { label: 'NEET pattern', href: 'https://www.shiksha.com/medicine-health-sciences/neet-exam-pattern' },
                    { label: 'CUET pattern', href: 'https://www.pw.live/cuet/exams/cuet-exam-pattern' },
                    { label: 'SSC CGL pattern', href: 'https://www.pw.live/ssc/exams/ssc-cgl-exam-pattern' },
                    { label: 'GATE marking', href: 'https://www.imsindia.com/blog/gate/gate-marking-scheme/' },
                ],
            },
        ],
    },
};
