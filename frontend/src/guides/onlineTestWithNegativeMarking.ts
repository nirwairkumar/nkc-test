/**
 * testoza.com/online-test-with-negative-marking — setting negative marking in an online
 * test, every major Indian exam's scheme, the arithmetic of guessing, and teaching it.
 * Written for coaching faculty and test-series makers, and for students who want to know
 * when a guess is worth taking.
 *
 * Distinct from the exam guides (JEE, NEET, SSC, bank), which each cover one pattern. This
 * page is the hub for negative marking itself.
 *
 * Facts and where they come from:
 *   - JEE Main and NEET +4/−1; SSC CGL/CHSL Tier 1 +2/−0.5; bank exams −¼ of the question's
 *     marks with five options: as in the exam guides (jeeMockTestPlatform.ts,
 *     neetOnlineTestSoftware.ts, sscMockTestPlatform.ts, bankExamMockTestPlatform.ts).
 *   - CUET UG +5/−1 (NTA; consistent across coaching summaries for 2026).
 *   - GATE: 1-mark MCQ −1/3, 2-mark MCQ −2/3, no penalty on MSQ and NAT (GATE brochures).
 *   - UPSC Civil Services prelims: one third of the marks assigned to the question (UPSC
 *     notification).
 *   - CAT: +3/−1 on multiple choice, none on typed (TITA) answers.
 *   - CLAT: −0.25 per wrong answer.
 *   - CBSE board exams: no negative marking.
 *   - Guess values: right/n × marks − (n−1)/n × penalty. JEE ten-guess figure:
 *     P(k ≤ 1) for k ~ Bin(10, 1/4) = 0.75¹⁰ + 10 × 0.25 × 0.75⁹ ≈ 0.244.
 *   - TestoZa behaviour: see the header of testMakerData.ts.
 */
import { TEST_MAKER_PAGES } from './testMakerData';
import { compareFallback, scenariosFallback, stepsFallback } from './howtoFallback';
import { NEGATIVE_MARKING_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const P = TEST_MAKER_PAGES.negative;

export const ONLINE_TEST_WITH_NEGATIVE_MARKING: Guide = {
    meta: NEGATIVE_MARKING_META,
    body: {
        intro: [
            html(`
<p>Negative marking is the rule that takes marks away for a wrong answer. Most Indian entrance and recruitment exams use it: −1 for a wrong answer in JEE Main and NEET, −0.5 in SSC’s Tier 1, a quarter of the question’s marks in bank exams, a third in GATE and the UPSC prelims. Board exams such as CBSE don’t use it at all.</p>
<p>For anyone making online tests, negative marking has two halves. The first is setting it correctly, so that a practice test scores exactly like the real exam, to the decimal. The second is teaching it, because students who practise for months without a penalty arrive at the exam with a guessing habit the real paper punishes.</p>
<p>This guide covers both: how negative marking works and why exams use it, every major Indian exam’s scheme, the arithmetic of when a guess is worth taking, how to set any scheme in <a href="/">TestoZa</a>, and how to explain it to students.</p>
`),
        ],

        answer:
            'An online test with negative marking takes marks away for each wrong answer, while a blank scores zero. To set it in TestoZa, choose “JEE / NEET (+4, −1)” at the top of the builder, or type any values into each question’s Marks and Wrong boxes: 0.5 for SSC, 0.25 for a one-mark bank question, 0.3333 for a third. Multiple-correct questions can take proportional or JEE Advanced partial marks, and numerical questions can carry their own penalty or none. The summary line shows the penalty per wrong answer and the total marks, and the result shows right, wrong and skipped answers for every student. Building tests is free.',

        sections: [
            {
                id: 'how-it-works',
                title: 'How negative marking works, and why exams use it',
                tocLabel: 'How it works',
                kicker: 'The basics',
                blocks: [
                    html(`
<p>A question with negative marking has three possible outcomes: a right answer gains its marks, a wrong answer loses the penalty, and a blank scores zero. On a +4/−1 paper, a student who answers 60 questions correctly, 20 wrongly and leaves 10 blank scores 60 × 4 − 20 × 1 = 220.</p>
<p>Exams use it to cancel out blind guessing. Without a penalty, a student who knows nothing can tick an option on every question and expect a quarter of the marks on a four-option paper. With the right penalty, that expected gain falls to zero, so marks go to what students know.</p>
<p>The penalty that exactly cancels a blind guess is the marks divided by the number of wrong options: a third of the marks with four options, a quarter with five. That is why GATE and the UPSC prelims take a third of the marks on four-option questions, and why bank exams, with five options, take a quarter. JEE Main and NEET take less (−1 on a +4 question, a quarter of the marks with four options), so a blind guess there is still worth a little on average.</p>
<p class="al-note">Negative marks don’t apply to blank answers in any major Indian exam. A blank always scores zero.</p>
`),
                ],
            },
            {
                id: 'schemes',
                title: 'Negative marking in every major Indian exam',
                tocLabel: 'Exam schemes',
                kicker: 'Reference',
                blocks: [
                    html(`
<p>The schemes as they stood in October 2026. Exams change their rules, so check the year’s official notification before a test series starts.</p>
<div class="al-table-wrap al-table-wrap--wide"><table class="al-table">
<thead><tr><th scope="col">Exam</th><th scope="col">Right</th><th scope="col">Wrong</th><th scope="col">Notes</th><th scope="col">TestoZa Marks / Wrong</th></tr></thead>
<tbody>
<tr><th scope="row">JEE Main</th><td data-label="Right">+4</td><td data-label="Wrong">−1</td><td data-label="Notes">Four options; numerical questions as the year’s bulletin says</td><td data-label="TestoZa">4 / 1</td></tr>
<tr><th scope="row">JEE Advanced</th><td data-label="Right">Varies by question type</td><td data-label="Wrong">Varies</td><td data-label="Notes">Partial marks on multiple-correct questions; rules set each year</td><td data-label="TestoZa">Per question, JEE Advanced partial marks</td></tr>
<tr><th scope="row">NEET UG</th><td data-label="Right">+4</td><td data-label="Wrong">−1</td><td data-label="Notes">Four options, single correct</td><td data-label="TestoZa">4 / 1</td></tr>
<tr><th scope="row">CUET UG</th><td data-label="Right">+5</td><td data-label="Wrong">−1</td><td data-label="Notes">Four options</td><td data-label="TestoZa">5 / 1</td></tr>
<tr><th scope="row">SSC CGL and CHSL, Tier 1</th><td data-label="Right">+2</td><td data-label="Wrong">−0.5</td><td data-label="Notes">Four options; other SSC papers differ</td><td data-label="TestoZa">2 / 0.5</td></tr>
<tr><th scope="row">Bank exams (IBPS, SBI)</th><td data-label="Right">Varies by section</td><td data-label="Wrong">−¼ of the question’s marks</td><td data-label="Notes">Five options</td><td data-label="TestoZa">1 / 0.25, or 1.5 / 0.375 and so on</td></tr>
<tr><th scope="row">GATE</th><td data-label="Right">+1 or +2</td><td data-label="Wrong">−1/3 or −2/3</td><td data-label="Notes">Multiple choice only; no penalty on multiple-select or numerical questions</td><td data-label="TestoZa">1 / 0.3333 and 2 / 0.6667</td></tr>
<tr><th scope="row">UPSC Civil Services, prelims</th><td data-label="Right">+2 (General Studies I)</td><td data-label="Wrong">−⅓ of the marks</td><td data-label="Notes">Four options</td><td data-label="TestoZa">2 / 0.6667</td></tr>
<tr><th scope="row">CAT</th><td data-label="Right">+3</td><td data-label="Wrong">−1</td><td data-label="Notes">No penalty on questions answered by typing</td><td data-label="TestoZa">3 / 1, typed answers 3 / 0</td></tr>
<tr><th scope="row">CLAT</th><td data-label="Right">+1</td><td data-label="Wrong">−0.25</td><td data-label="Notes">Four options</td><td data-label="TestoZa">1 / 0.25</td></tr>
<tr><th scope="row">CBSE board exams</th><td data-label="Right">As per the question</td><td data-label="Wrong">None</td><td data-label="Notes">Wrong answers simply score zero</td><td data-label="TestoZa">1 / 0, the default</td></tr>
</tbody>
</table></div>
<p>Each exam has its own guide with the full pattern: <a href="/jee-mock-test-platform">JEE Main</a>, <a href="/jee-advanced-mock-test-software">JEE Advanced</a>, <a href="/neet-online-test-software">NEET</a>, <a href="/ssc-mock-test-platform">SSC</a> and <a href="/bank-exam-mock-test-platform">bank exams</a>.</p>
`),
                ],
            },
            {
                id: 'guessing',
                title: 'When a guess is worth taking',
                tocLabel: 'When to guess',
                kicker: 'The arithmetic',
                blocks: [
                    html(`
<p>Whether to guess depends on two numbers: how many options are left after ruling out the ones you know are wrong, and how big the penalty is. The average value of a guess is the chance of being right times the marks, minus the chance of being wrong times the penalty. Pick an exam to see what that gives:</p>
`),
                    { type: 'widget', widget: 'hw-scenarios', fallbackHtml: scenariosFallback(P) },
                    html(`
<p>Three rules come out of these numbers, and they are worth teaching in this order:</p>
<ol class="al-list al-list--num">
<li><strong>Rule out one option and the guess pays in almost every exam.</strong>Even where a blind guess is worth exactly zero, eliminating one wrong option makes the guess worth something on average.</li>
<li><strong>A blind guess is close to worthless.</strong>In GATE, UPSC, CAT and bank exams it is worth exactly zero on average. In JEE and NEET it is worth a little, but it is a gamble, and the gamble often loses: ten blind guesses on a +4/−1 paper end below zero about one time in four.</li>
<li><strong>Never leave an unpenalised question blank.</strong>GATE’s numerical and multiple-select questions, CAT’s typed answers and every CBSE question cost nothing if wrong, so an answer always beats a blank.</li>
</ol>
<p>Averages are averages. A guess either gains the full marks or loses the penalty, so a handful of guesses can go either way on one paper. Over a whole test series, though, the student who follows these rules scores higher than the one who guesses everything or nothing.</p>
`),
                ],
            },
            {
                id: 'set-it',
                title: 'How to set negative marking in TestoZa',
                tocLabel: 'Set it up',
                kicker: 'Step by step',
                blocks: [
                    html(`
<p>New tests start with no negative marking: one mark per question and nothing taken off for a wrong answer, so a class quiz never goes below zero by accident. You switch the penalty on when the exam you are preparing for uses it.</p>
${stepsFallback(P)}
<p>A few details that matter when copying a real exam exactly:</p>
<ul class="al-list">
<li><strong>Type the penalty without a minus sign.</strong>The Wrong box already means “take this off”. Type 1, 0.5 or 0.25.</li>
<li><strong>Thirds are typed as decimals.</strong>The box takes digits and a decimal point, not fractions, so a third is 0.3333 and two thirds 0.6667. Across a whole paper the difference from an exact third is a few thousandths of a mark.</li>
<li><strong>Different sections can have different marking.</strong>Marks and Wrong belong to each question, so a GATE paper’s 1-mark and 2-mark questions, or a bank mains paper with different marks per section, are set exactly.</li>
<li><strong>Multiple-correct questions have their own rule.</strong>Choose <em>Proportional</em> (marks × correct options picked ÷ all correct options, and any wrong option gets the Wrong mark) or <em>JEE Advanced</em> (+1 for each correct option picked, full marks only for all of them, any wrong option gets the Wrong mark).</li>
<li><strong>Numerical answers can be checked by range.</strong>Accept anything from 9.7 to 9.9, or exact values, and give the question its own Wrong mark, or 0 where the exam doesn’t penalise numerical answers.</li>
</ul>
<p>Under the Marking switch, a summary line reads, for example, “−1 for every wrong answer — a student can finish below zero. 30 questions, 120 marks in total.” If the questions carry different penalties, it says how many deduct marks. Read it once before sharing; it catches most mistakes.</p>
`),
                ],
            },
            {
                id: 'practice',
                title: 'Practice with the real penalty, or without one',
                tocLabel: 'With or without',
                kicker: 'Teaching',
                blocks: [
                    html(`
<p>Whether practice tests should carry the penalty is a teaching decision. For exam preparation, the answer is nearly always yes, for reasons that show up in the results.</p>
`),
                    { type: 'widget', widget: 'hw-compare', fallbackHtml: compareFallback(P) },
                    html(`
<p>A sensible way to introduce it to a new batch: run the first two or three tests without a penalty while students get used to the exam screen, explain the arithmetic in one class with the numbers above, then switch the real penalty on and keep it on. Put the marking in each test’s description so nobody is surprised.</p>
`),
                ],
            },
            {
                id: 'results',
                title: 'Reading results on a negative-marked test',
                tocLabel: 'Results',
                kicker: 'After the test',
                blocks: [
                    html(`
<p>Each student’s result shows their score with right, wrong and skipped answers, overall and for each section. Two numbers are worth more than the score itself:</p>
<div class="al-cards">
<div class="al-card" data-tone="orange" data-icon="pencil"><h3>Marks lost to wrong answers</h3><p>Wrong answers × the penalty. On +4/−1, twenty wrong answers are twenty marks thrown away, and often the gap to the next rank.</p></div>
<div class="al-card" data-tone="blue" data-icon="sparkles"><h3>Accuracy</h3><p>Right answers ÷ attempted. A student at 60% accuracy should attempt fewer questions; one at 90% should attempt more.</p></div>
<div class="al-card" data-tone="purple" data-icon="layers"><h3>Skipped by section</h3><p>Many blanks in one section can mean caution or a lack of time. Ask before deciding which.</p></div>
</div>
<p>The examiner’s report adds a rank list, each question’s right, wrong and blank counts, and the wrong option most students picked, which shows a common misconception at a glance. The Excel export gives you every student’s scores for your own analysis.</p>
`),
                ],
            },
            {
                id: 'limits',
                title: 'What TestoZa’s marking doesn’t do',
                tocLabel: 'Limits',
                kicker: 'Honest limits',
                blocks: [
                    html(`
<ul class="al-limits">
<li><strong>Fractions can’t be typed.</strong> Use 0.3333 for a third. Results differ from an exact third by a few thousandths of a mark over a paper.</li>
<li><strong>No penalty for blanks.</strong> A blank always scores zero, as in every major Indian exam. A paper that penalises unanswered questions can’t be copied.</li>
<li><strong>No normalisation across shifts.</strong> Two batches on different papers get raw scores; compare ranks within each batch, or give both the same paper.</li>
<li><strong>Written answers aren’t marked.</strong> Marking covers single and multiple-correct questions, numerical answers and passages.</li>
</ul>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'How do I create an online test with negative marking?',
                a: 'In TestoZa, choose “JEE / NEET (+4, −1)” at the top of the builder, or type the marks and the penalty into each question’s Marks and Wrong boxes: for example 2 and 0.5 for SSC, or 1 and 0.25 for a bank exam. The summary line confirms the penalty and the total marks before you share the test.',
            },
            {
                q: 'Can I set −0.25 or −0.33 negative marking?',
                a: 'Yes. The Wrong box takes any decimal: 0.25 for a quarter, 0.5 for a half, 0.3333 for a third and 0.6667 for two thirds. Fractions such as 1/3 can’t be typed, so use the decimal.',
            },
            {
                q: 'Does a blank answer get negative marks?',
                a: 'No. In TestoZa, as in every major Indian exam, a question left blank scores zero. Only a wrong answer loses the penalty.',
            },
            {
                q: 'Can different questions have different negative marks?',
                a: 'Yes. Marks and Wrong belong to each question, so a paper can mix 1-mark and 2-mark questions with −1/3 and −2/3, as GATE does, or give each section its own marking, as bank mains papers do.',
            },
            {
                q: 'How does negative marking work for multiple-correct questions?',
                a: 'Choose Proportional or JEE Advanced for each multiple-correct question. Proportional gives a share of the marks for each correct option picked; JEE Advanced gives +1 per correct option and full marks only for all of them. In both, picking any wrong option gets the Wrong mark.',
            },
            {
                q: 'Should I guess in an exam with negative marking?',
                a: 'Guess when you can rule out at least one option: the guess then pays on average in every major Indian exam. A blind guess is worth exactly zero on average in GATE, UPSC, CAT and bank exams, and a little in JEE and NEET, but it is a gamble. Never leave a question with no penalty blank.',
            },
            {
                q: 'Why do exams have negative marking?',
                a: 'To cancel out blind guessing, so that marks reflect what a candidate knows. With four options, a penalty of a third of the marks makes a blind guess worth exactly zero on average; with five options, a quarter does.',
            },
            {
                q: 'Is negative marking free to use in TestoZa?',
                a: 'Yes. Every marking setting, partial marks and numerical answers included, is part of the free test builder. Paid plans from ₹49 for 7 days add exam rules such as full screen and tab-switch limits, branding and Excel export.',
            },
        ],

        closingTitle: 'Copy your exam’s marking to the decimal.',
        closing: [
            html(`
<p>Take a paper you already use, set its real marking, and answer three questions wrong on purpose. If the score matches what the real exam would give, your practice tests are counting the same way the exam does.</p>
<div class="al-paths">
<a class="al-path" href="/create-test" data-icon="pencil"><span class="al-path-who">Building a paper?</span><span class="al-path-what">Set Marks and Wrong on each question</span></a>
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Have the paper as a PDF?</span><span class="al-path-what">Upload it, then set the marking</span></a>
<a class="al-path" href="/sectional-test-maker" data-icon="layers"><span class="al-path-who">Exam with timed sections?</span><span class="al-path-what">Read the sectional test guide</span></a>
</div>
<p>Related reading: <a href="/jee-advanced-mock-test-software">JEE Advanced partial marking</a>, <a href="/full-length-online-test-maker">full-length mock tests</a>, <a href="/cbt-exam-software">CBT exam software</a> and <a href="/guides">all guides</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Exam bodies',
                links: [
                    { label: 'JEE Main (NTA)', href: 'https://jeemain.nta.nic.in/' },
                    { label: 'NEET UG (NTA)', href: 'https://neet.nta.nic.in/' },
                    { label: 'CUET UG (NTA)', href: 'https://cuet.nta.nic.in/' },
                    { label: 'Staff Selection Commission', href: 'https://ssc.gov.in/' },
                    { label: 'IBPS', href: 'https://www.ibps.in/' },
                    { label: 'UPSC', href: 'https://upsc.gov.in/' },
                    { label: 'CAT', href: 'https://iimcat.ac.in/' },
                    { label: 'CLAT (Consortium of NLUs)', href: 'https://consortiumofnlus.ac.in/' },
                ],
            },
            {
                label: 'TestoZa',
                links: [
                    { label: 'Pricing', href: 'https://testoza.com/pricing' },
                    { label: 'Create a test', href: 'https://testoza.com/create-test' },
                ],
            },
        ],
    },
};
