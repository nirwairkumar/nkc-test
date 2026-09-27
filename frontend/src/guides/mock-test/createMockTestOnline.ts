/**
 * testoza.com/create-mock-test-online — how to turn a textbook photo, a PDF or
 * an old question paper into a timed, exam-style mock test.
 *
 * Every word of the page lives here. The React page (src/pages/guides) renders
 * it and the Cloudflare worker serves the same text to crawlers, so edit it here.
 * Product claims were checked against the app on 2026-09-27: AITestImporter
 * (Extract / Generate, answer key, languages, difficulty), TestPage (NTA palette,
 * numeric pad, calculator), BehavioralTimeMatrix (the four groups), PricingPage.
 */
import type { Guide, GuideStep } from './types';

const esc = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ── Data shared by the interactive widgets and their crawler fallbacks ───── */

export const SOURCE_OPTIONS = [
    {
        id: 'paper',
        tab: 'Question paper',
        mode: 'Extract Questions',
        bestFor: 'Previous-year papers, sample papers, question banks, worksheets',
        youGet: 'Every question, option and diagram exactly as printed',
        input: 'Photo or PDF of a paper',
        output: 'The same paper, timed and auto-graded',
    },
    {
        id: 'chapter',
        tab: 'Textbook or notes',
        mode: 'Generate New Questions',
        bestFor: 'Textbook chapters, class notes, lecture slides',
        youGet: 'Fresh questions at Easy, Moderate or Tough, in English, Hindi or both',
        input: 'Photos of the chapter',
        output: 'A new test on exactly what you studied',
    },
    {
        id: 'type',
        tab: 'Type it yourself',
        mode: 'Test builder',
        bestFor: 'Your own questions, or polishing an AI draft',
        youGet: 'MCQs, multi-correct, numericals and passages, with LaTeX for maths',
        input: 'Your questions',
        output: 'A paper written exactly your way',
    },
] as const;

/** The five question states of the NTA-style palette, in the order the legend shows them. */
export const PALETTE_STATUSES = [
    { id: 'not-visited', label: 'Not visited', meaning: 'You haven’t opened this question yet.' },
    { id: 'not-answered', label: 'Not answered', meaning: 'You opened it and moved on without saving an answer.' },
    { id: 'answered', label: 'Answered', meaning: 'Your answer is saved and will be graded.' },
    { id: 'marked', label: 'Marked for review', meaning: 'Flagged to come back to, with no answer saved.' },
    { id: 'answered-marked', label: 'Answered & marked for review', meaning: 'An answer is saved (and will be graded), but you want another look.' },
] as const;

/** The four groups of the result page's time matrix (BehavioralTimeMatrix.tsx). */
export const TIME_GROUPS = [
    {
        id: 'fast-correct',
        title: 'Fast & accurate',
        tag: 'Mastered',
        advice: 'Instant recall. Leave these alone; they’re done. Revising them feels good and changes nothing.',
    },
    {
        id: 'slow-correct',
        title: 'Slow & accurate',
        tag: 'Needs speed',
        advice: 'You know it, but it costs too much time. Drill the same type against a timer until it’s automatic.',
    },
    {
        id: 'fast-wrong',
        title: 'Fast & careless',
        tag: 'Silly slips',
        advice: 'Wrong answers given quickly, usually a misread question or an arithmetic slip. The fix is a habit, not a chapter: underline what’s asked and re-check the units.',
    },
    {
        id: 'time-traps',
        title: 'Time traps',
        tag: 'Biggest leak',
        advice: 'A long time spent and still wrong or skipped. This is where marks leak out of a paper. Learn to spot them in the first 30 seconds, move on, and come back only if there’s time left.',
    },
] as const;

/* ── The how-to steps (also HowTo structured data) ───────────────────────── */

const STEPS: GuideStep[] = [
    {
        name: 'Take photos the AI can read',
        text: 'Lay the page flat in daylight or under a white lamp and shoot straight down, one page per photo, so the lines don’t bend. Fill the frame with the page, not the desk. If a thumb or a shadow covers a line, the AI can’t read what it can’t see.',
    },
    {
        name: 'Open the AI test creator and add your files',
        text: 'Sign in with a free TestoZa account, open the AI test creator and choose your photos, PDF, Word or PowerPoint file. Add more files before you start, so a whole chapter goes in at once.',
        html: 'Sign in with a free TestoZa account, open the <a href="/generate-with-ai">AI test creator</a> and choose your photos, PDF, Word or PowerPoint file. Add more files before you start, so a whole chapter goes in at once.',
    },
    {
        name: 'Choose Extract or Generate',
        text: 'Pick Extract Questions when the questions already exist and you want them exactly as printed. Pick Generate New Questions when you’re giving it a chapter or notes and want fresh questions. If the answers are on a separate sheet, upload it as the answer key.',
    },
    {
        name: 'Write in the real marking scheme',
        text: 'Type the exam’s scheme into the instructions box: “4 marks each, minus 1 for a wrong answer” for a JEE Main style paper, or “2 marks each, 0.5 negative” for SSC CGL practice. People skip this step, and it’s the one that makes the score mean something.',
    },
    {
        name: 'Review every question and answer',
        text: 'Read each question and check its answer before you save. AI reads clean print well, but a smudged 6 can become a 0 and a diagram can land beside the wrong question. Fix anything in the editor. Five minutes here saves an hour of doubting your score.',
    },
    {
        name: 'Set the timer to the exam’s pace',
        text: 'Match the real paper’s time per question, not the time you’d like. SSC CGL Tier 1 allows 60 minutes for 100 questions, about 36 seconds each; UPSC prelims GS Paper I allows 2 hours for 100, about 72 seconds. A 25-question mock at SSC pace gets 15 minutes. Tight is the point.',
    },
    {
        name: 'Sit it like it counts',
        text: 'Phone on silent, one sitting, no pausing and no book. Submit when the timer ends, then stay on the result page, because the analysis is worth more than the score.',
    },
];

const stepsHtml = `<ol class="cmt-steps">
${STEPS.map(
    (s, i) => `<li data-reveal style="--d:${i}"><h3>${esc(s.name)}</h3><p>${s.html ?? esc(s.text)}</p></li>`,
).join('\n')}
</ol>`;

/* ── Widget fallbacks (what crawlers and no-JS readers get) ─────────────── */

const sourceFallback = `<ul class="cmt-fallback-list">
${SOURCE_OPTIONS.map((o) => `<li><strong>${esc(o.tab)} → ${esc(o.mode)}.</strong> Best for: ${esc(o.bestFor)}. You get: ${esc(o.youGet)}.</li>`).join('\n')}
</ul>`;

const paletteFallback = `<p>The five colours of the question palette:</p>
<ul class="cmt-fallback-list">
${PALETTE_STATUSES.map((s) => `<li><strong>${esc(s.label)}:</strong> ${esc(s.meaning)}</li>`).join('\n')}
</ul>`;

const matrixFallback = `<ul class="cmt-fallback-list">
${TIME_GROUPS.map((g) => `<li><strong>${esc(g.title)} (${esc(g.tag)}):</strong> ${esc(g.advice)}</li>`).join('\n')}
</ul>`;

/* ── The guide ───────────────────────────────────────────────────────────── */

export const CREATE_MOCK_TEST_ONLINE: Guide = {
    meta: {
        slug: 'create-mock-test-online',
        path: '/create-mock-test-online',
        title: 'Create a mock test online from a photo, a PDF or last year’s paper',
        titleLead: 'Create a mock test online',
        seoTitle: 'Create Mock Test Online Free: From a Photo, PDF or Old Paper',
        description:
            'Turn a textbook photo, a PDF or last year’s question paper into a timed, exam-style mock test in minutes. Free for students, teachers and coaching institutes.',
        dek:
            'Reading a chapter again feels productive. Sitting a timed paper is what actually gets you ready. Here’s how students, teachers and coaching institutes turn the material already on their desk into a real, exam-style mock test on TestoZa, and how to read the result so the next score goes up.',
        eyebrow: 'Guide · Mock tests',
        author: 'TestoZa Team',
        datePublished: '2026-09-27T12:00:00+05:30',
        dateModified: '2026-09-27T12:00:00+05:30',
        readMinutes: 14,
        cover: {
            src: '/guides/create-mock-test-online/cover.png',
            alt: 'A phone photographing a textbook page, and the same page turned into a timed mock test with a question palette',
            width: 1200,
            height: 630,
        },
        keywords: [
            'create mock test online',
            'mock test maker',
            'create mock test online free',
            'make mock test from pdf',
            'create test from photo',
            'question paper to online test',
            'create your own mock test',
            'online mock test creator for students',
            'mock test for coaching institute',
            'jee mock test interface',
            'practice test maker',
        ],
        cta: { label: 'Create a mock test free', href: '/generate-with-ai' },
        howTo: {
            name: 'How to create a mock test online from a textbook photo or question paper',
            totalTime: 'PT10M',
        },
    },
    body: {
        takeaways: [
            'A mock test copies the real exam: the same time limit, the same marking (negative marks included) and the same kind of screen. A quiz doesn’t.',
            'On TestoZa you can build one from a phone photo of a textbook page, a PDF or Word file, an old question paper, or questions you type yourself.',
            'Extract keeps questions exactly as printed. Generate writes new ones from your chapter, in English, Hindi or both.',
            'Tests open in an NTA-style exam screen with a question palette, Mark for Review and an on-screen keypad for numerical answers.',
            'The result shows where your time went, not just your score. That’s where the next ten marks are.',
        ],
        intro: [
            {
                type: 'html',
                html: `<p class="cmt-lede">Most students don’t lose marks because they never studied the chapter. They lose them at minute 47, stuck on a question they could have solved at home in four minutes, while the clock quietly eats the last section.</p>
<p>That gap, between knowing something and producing it on demand with a timer running, is the whole reason mock tests exist. For years the only ways to get a decent one were to buy a test series, wait for your coaching centre’s Sunday paper, or hope someone had uploaded last year’s questions in a format you could actually use.</p>
<p>You don’t have to wait for any of that now. If you can photograph it, you can practise it. A page of your NCERT textbook, the sample paper your teacher handed out, a PDF of previous years’ questions, your own notes if the handwriting is kind: <a href="/">TestoZa</a> reads it and turns it into a timed, auto-graded test that behaves like the real thing. Teachers and coaching institutes use the same tool to run weekly tests for a whole batch. The only difference is who gets the link.</p>
<p>This guide covers the whole method: what makes a mock test worth sitting, the three ways to build one, how to make it feel like exam day, and how to read the result without fooling yourself.</p>`,
            },
        ],
        sections: [
            {
                id: 'what-is-a-mock-test',
                title: 'What a mock test is, and why a quiz isn’t one',
                tocLabel: 'What a mock test is',
                blocks: [
                    {
                        type: 'html',
                        html: `<p><strong>A mock test is a practice exam that copies the real one as closely as it can:</strong> the same number and type of questions, the same time limit, the same marking scheme including negative marks, and ideally the same kind of screen. It’s a rehearsal, not a revision exercise.</p>
<p>That sounds obvious until you look at what usually passes for practice. Ten untimed questions at the end of a chapter are a quiz. A worksheet you check against the answers at the back of the book is a practice set. Both are useful. Neither tells you whether you’ll finish the paper, whether you freeze when three hard questions arrive in a row, or whether your habit of “just attempting” the doubtful ones earns more than it costs once negative marking kicks in.</p>
<div class="cmt-table-wrap" data-reveal>
<table class="cmt-table">
<caption>Quiz, practice set and mock test compared</caption>
<thead><tr><th scope="col"><span class="cmt-sr">What changes</span></th><th scope="col">Quiz</th><th scope="col">Practice set</th><th scope="col" class="is-mock">Mock test</th></tr></thead>
<tbody>
<tr><th scope="row">Time limit</th><td>None, or loose</td><td>Sometimes</td><td class="is-mock">Same as the real exam</td></tr>
<tr><th scope="row">Marking</th><td>Right or wrong</td><td>Usually right or wrong</td><td class="is-mock">The exam’s scheme, negative marks included</td></tr>
<tr><th scope="row">Length</th><td>5 to 15 questions</td><td>One topic</td><td class="is-mock">A full paper or a full section</td></tr>
<tr><th scope="row">Screen</th><td>Anything</td><td>Book or screen</td><td class="is-mock">Looks like the exam</td></tr>
<tr><th scope="row">What it answers</th><td>Do I remember this?</td><td>Can I solve this type?</td><td class="is-mock">What would I score on the day?</td></tr>
</tbody>
</table>
</div>
<p>You need all three at different stages of preparation. But only the mock measures the skill the exam actually grades, which is performance under constraint. Treat it that way and it becomes the most useful hour of your week.</p>`,
                    },
                ],
            },
            {
                id: 'why-mock-tests-work',
                title: 'Why testing yourself beats reading the chapter again',
                tocLabel: 'Why it works',
                blocks: [
                    {
                        type: 'html',
                        html: `<p>The mock-test habit works for a reason that has little to do with “getting used to the format”. Pulling an answer out of your own memory strengthens that memory far more than looking at the answer again. Psychologists call it the <em>testing effect</em>, or retrieval practice, and it’s one of the best-replicated findings in learning research.</p>
<p>The classic experiment is simple. In 2006, Henry Roediger and Jeffrey Karpicke at Washington University in St. Louis gave students short prose passages. One group studied a passage in four separate five-minute sessions. Another studied it in one session and then took three recall tests, writing down everything they could remember, with no feedback. Then everyone sat a final test, some five minutes later and some a week later.</p>
<figure class="cmt-stat" data-reveal>
<figcaption class="cmt-stat-cap">Ideas recalled one week later</figcaption>
<div class="cmt-bar" style="--v:40"><span class="cmt-bar-label">Studied it four times</span><span class="cmt-bar-track"><span class="cmt-bar-fill"></span></span><span class="cmt-bar-val">40%</span></div>
<div class="cmt-bar cmt-bar--win" style="--v:61"><span class="cmt-bar-label">Studied it once, then tested three times</span><span class="cmt-bar-track"><span class="cmt-bar-fill"></span></span><span class="cmt-bar-val">61%</span></div>
<p class="cmt-stat-src">Roediger &amp; Karpicke (2006), <cite>Psychological Science</cite> 17(3), Experiment 2.</p>
</figure>
<p>Here’s the part that should worry every “let me revise it once more” student. On the test five minutes after studying, the rereading group came out <em>ahead</em>, 83% against 71%, and they were more confident they’d remember the passage a week later. Rereading feels like it works because, in the short run, it does. A week later, the students who had tested themselves were far ahead.</p>
<blockquote class="cmt-quote" data-reveal><p>Reading tells you what you’ve seen. A test tells you what you can use.</p></blockquote>
<p>A larger review in 2013, led by John Dunlosky and published in <cite>Psychological Science in the Public Interest</cite>, rated ten popular study techniques. Only two earned a “high utility” rating: practice testing, and spreading study sessions out over time. Highlighting and rereading, the two things most of us actually do the night before, were rated low.</p>
<p>A mock test adds two things on top of plain recall. <strong>Pacing:</strong> you find out how long 25 questions really take you, which is almost never what you guessed. <strong>The screen:</strong> if your exam is computer-based, the first time you see a question palette and a “Mark for Review” button should not be the morning of the exam.</p>`,
                    },
                ],
            },
            {
                id: 'three-ways',
                title: 'Three ways to build a mock test on TestoZa',
                tocLabel: 'Three ways to build one',
                blocks: [
                    {
                        type: 'html',
                        html: `<p>Everything starts in one of two places: the <a href="/generate-with-ai">AI test creator</a>, when you have material for it to read, or the <a href="/create-test">test builder</a>, when you’d rather type. What changes is what you bring, plus one decision: keep the questions exactly as they are, or have new ones written from your material.</p>`,
                    },
                    { type: 'widget', widget: 'source-picker', fallbackHtml: sourceFallback },
                    {
                        type: 'html',
                        html: `<h3>1. Snap or upload a question paper: <em>Extract</em></h3>
<p>Got a printed sample paper, a PDF of previous years’ questions, a coaching worksheet or a page from a question bank? Upload it and choose <strong>Extract Questions</strong>. PDF, Word, PowerPoint, JPG, PNG and WebP all work, and you can add several photos at once. The AI copies each question and its options as printed and keeps diagrams with the question they belong to. If the answers sit on a separate sheet, upload that as the answer key and they’re matched to the right questions.</p>
<p>This is the mode for “I want to sit this exact paper under exam conditions”. Previous-year questions are the obvious use. So is that photocopied class test from last term you never actually timed.</p>
<h3>2. Upload a chapter or your notes: <em>Generate</em></h3>
<p>Studying from a textbook, a PDF of notes or a set of lecture slides? Choose <strong>Generate New Questions</strong> and the AI writes fresh questions from the content instead of copying any. Pick a difficulty (Easy, Moderate or Tough) and a language: the same as your material, English, Hindi, or both together for a bilingual paper. Then add instructions in plain words, like “30 questions, 4 marks each, minus 1 for a wrong answer, mostly numericals”.</p>
<p>Students tend to underrate this one. Photograph the eight pages you finished this week and you get a test on exactly what you studied, not whatever topic the test series happens to cover next month. Learning from video instead? Paste a lecture link into <a href="/youtube-to-quiz">YouTube to quiz</a> and you get questions from the video. There’s more on the reading side under <a href="/pdf-to-quiz">PDF to quiz</a> and the <a href="/ai-question-generator">AI question generator</a>.</p>
<h3>3. Type it, paste it, or mix both: <em>the builder</em></h3>
<p>Some papers you want to write yourself. The <a href="/create-test">test builder</a> handles single-correct and multi-correct MCQs, numerical-answer questions (with an accepted range if you want to allow for rounding), and comprehension passages with several questions under one text. Maths and chemistry go in as LaTeX or through the on-screen maths keyboard, and any single question can be filled in from a photo. Plenty of teachers use the AI for the first draft and the builder for the last ten per cent. The <a href="/mcq-test-maker">MCQ test maker</a> page covers the question types in more detail.</p>`,
                    },
                ],
            },
            {
                id: 'step-by-step',
                title: 'Step by step: from a textbook photo to a timed paper',
                tocLabel: 'Step by step',
                blocks: [
                    {
                        type: 'html',
                        html: `<p>Here’s the full run for the most common case: a student turning textbook pages or an old paper into a mock. Give it about ten minutes the first time. Most of that goes on step five, and it should.</p>
${stepsHtml}
<aside class="cmt-tip" data-reveal><p><strong>Short on time?</strong> Build a 20-minute sectional instead of a full paper. A short mock sat properly beats a long one sat with the book open.</p></aside>`,
                    },
                ],
            },
            {
                id: 'exam-day',
                title: 'Make it feel like exam day',
                tocLabel: 'Exam-day feel',
                blocks: [
                    {
                        type: 'html',
                        html: `<p>A mock only rehearses the exam if it looks and behaves like one. TestoZa tests open in an NTA-style interface by default, the layout students meet in computer-based exams such as JEE Main: the question on the left, a numbered palette on the right, and colours that tell you at a glance where you stand. Try it below. Tap an option, save, mark a question for review, jump around the palette.</p>`,
                    },
                    { type: 'widget', widget: 'palette-demo', fallbackHtml: paletteFallback },
                    {
                        type: 'html',
                        html: `<p>Get fluent with that palette now and exam day loses one source of nerves. A few other details carry over too:</p>
<ul class="cmt-list" data-reveal>
<li><span class="cmt-ico" data-i="keypad" data-c="blue"></span><div><strong>An on-screen keypad for numerical answers.</strong> JEE Main switches the keyboard off and makes you click numbers in on a virtual keypad. Practise that way and it isn’t new on the day.</div></li>
<li><span class="cmt-ico" data-i="timer" data-c="orange"></span><div><strong>A timer that doesn’t pause.</strong> It counts down in the corner, and when it reaches zero the test submits itself.</div></li>
<li><span class="cmt-ico" data-i="split" data-c="green"></span><div><strong>Sections with their own marking.</strong> Physics, chemistry and maths can each carry their own marks and negative marks, the way a real combined paper does.</div></li>
<li><span class="cmt-ico" data-i="calc" data-c="gray"></span><div><strong>A scientific calculator, only when the exam has one.</strong> Switch it on for GATE-style papers, which give you a virtual calculator, and leave it off for exams that don’t.</div></li>
<li><span class="cmt-ico" data-i="full" data-c="red"></span><div><strong>Full screen and tab-switch detection.</strong> Built for teachers running a supervised exam, and surprisingly good at stopping you from “quickly checking one thing”.</div></li>
<li><span class="cmt-ico" data-i="layers" data-c="purple"></span><div><strong>Two papers, one sitting.</strong> Combine tests into a single session with a timed break between them, the way JEE Advanced runs Paper 1 and Paper 2 on the same day.</div></li>
</ul>`,
                    },
                ],
            },
            {
                id: 'read-your-result',
                title: 'After the test: read the result like a coach would',
                tocLabel: 'Read your result',
                blocks: [
                    {
                        type: 'html',
                        html: `<p>The score tells you how the test went. It doesn’t tell you what to do on Monday. For that you need to know where the time went.</p>
<p>TestoZa’s result page sorts every question into four groups, by whether you got it right and how long you took compared with the pace the paper allows. Tap a group to see what to do about it:</p>`,
                    },
                    { type: 'widget', widget: 'time-matrix', fallbackHtml: matrixFallback },
                    {
                        type: 'html',
                        html: `<p>The first time most students see this, they find their problem isn’t knowledge at all. It’s nine minutes sunk into three time-trap questions in the first section, paid for later by rushing the last one. A score can’t show you that. The matrix shows it in about ten seconds.</p>
<h3>A retest routine that actually closes gaps</h3>
<p>Keep an error log. One line per wrong or skipped question: what it was about, and why you missed it. <em>Didn’t know</em>, <em>misread</em>, <em>too slow</em> or <em>guessed</em> covers nearly everything. Three days later, before you look at the solutions again, build a short test from just those questions and sit it. Spacing the retest out is the other “high utility” technique from that 2013 review, and it’s what makes a correction stick instead of fading by the weekend.</p>
<p>When you re-sit a paper, switch on <strong>Randomize Questions</strong> in the test settings. You want to be solving questions, not remembering that number 14 was C.</p>`,
                    },
                ],
            },
            {
                id: 'student-routine',
                title: 'For students: a weekly routine that fits around school',
                tocLabel: 'A weekly routine',
                blocks: [
                    {
                        type: 'html',
                        html: `<p>You don’t need a test every day. You need a rhythm you’ll still be following in eight weeks. Here’s one that suits a Class 11 or 12 student preparing for boards alongside JEE or NEET, or anyone on a long prep like SSC or banking. Stretch or shrink it to fit.</p>
<ol class="cmt-week" data-reveal>
<li><span class="cmt-day" data-c="blue">Mon</span><div><strong>Chapter test · 20 min</strong><span>Photograph what you studied last week. Generate 15 to 20 questions at Moderate.</span></div></li>
<li><span class="cmt-day" data-c="orange">Wed</span><div><strong>Previous-year drill · 30 min</strong><span>Extract one topic’s previous-year questions. Real timing, real marking.</span></div></li>
<li><span class="cmt-day" data-c="purple">Fri</span><div><strong>Error-log retest · 15 min</strong><span>Only last week’s wrong and skipped questions, in random order.</span></div></li>
<li><span class="cmt-day" data-c="green">Sat</span><div><strong>Full mock · exam length</strong><span>One complete paper in one sitting, ideally at the real exam’s start time.</span></div></li>
<li><span class="cmt-day" data-c="pink">Sun</span><div><strong>Analysis · 45 min</strong><span>Time matrix, error log, next week’s plan. No new chapters until this is done.</span></div></li>
</ol>
<p>Two small habits make a big difference. Sit the full mock at the same time of day the real exam starts, so your sharpest hours line up with the paper’s. And practise with friends: share your test link with your study group, everyone sits the same paper, then compare notes on the time traps. Explaining a question you got right to someone who got it wrong is retrieval practice too, for both of you.</p>
<p>Not ready to build your own yet? <a href="/more-tests">Browse the free tests</a> other educators have published and sit one tonight. And one more thing: tests you create are private until you share them, and tests built from a published textbook should stay that way. They’re for your own practice; the book’s content belongs to its publisher.</p>`,
                    },
                ],
            },
            {
                id: 'teachers-and-institutes',
                title: 'For teachers and coaching institutes: weekly mocks without a weekend of typing',
                tocLabel: 'Teachers & institutes',
                blocks: [
                    {
                        type: 'html',
                        html: `<p>If you teach a batch, you already own the raw material: years of papers in a cupboard, PDFs on a pen drive, worksheets you wrote yourself. The slow part was always turning them into something students can sit online, and that you don’t then have to correct by hand.</p>
<p>Upload the paper, extract it, fix the two questions the AI misread, and share one link over WhatsApp, email or Google Classroom. Students open it in any phone or laptop browser. There’s no app to install and they don’t need an account; you decide what the start form asks for, like a name and roll number. Answers are graded the moment they submit, negative marking included, and you get a rank list and question-by-question analysis for the whole batch.</p>
<p>For a supervised exam, set a start and end window, cap the number of attempts, force full screen, and decide what happens when a student switches tabs: a warning, a counted violation, or an instant submit. The <a href="/online-proctoring-software">online proctoring</a> page lists every control.</p>
<p>Creating tests, sharing them with unlimited students, the AI and auto-grading are all free. Your institute’s name and logo on every test page, Excel exports of results and the stricter anti-cheat controls come with the <a href="/pricing">paid plans</a>, which start at ₹49 a week. There are pages for <a href="/online-test-for-coaching">coaching institutes</a> and <a href="/exam-software-for-schools">schools</a>, and subject starting points for <a href="/create-test/physics">physics</a>, <a href="/create-test/chemistry">chemistry</a>, <a href="/create-test/mathematics">maths</a> and <a href="/create-test/biology">biology</a>.</p>
<aside class="cmt-tip" data-reveal><p><strong>Small fix before you share a PDF paper?</strong> A wrong date, a typo in the instructions? <a href="https://pdf.testoza.com/edit-pdf" target="_blank" rel="noopener">Panna</a>, our free PDF editor, changes the text in the document’s own font, and the file never leaves your computer.</p></aside>`,
                    },
                ],
            },
            {
                id: 'mistakes',
                title: 'Six mistakes that make a mock test useless',
                tocLabel: 'Common mistakes',
                blocks: [
                    {
                        type: 'html',
                        html: `<ol class="cmt-mistakes">
<li data-reveal style="--d:0"><strong>Building it only from what you already know.</strong> A mock you’re sure to ace is a confidence exercise. Put in the chapter you’ve been avoiding.</li>
<li data-reveal style="--d:1"><strong>Leaving out negative marking.</strong> Without it guessing is free, and you train a habit that costs marks on the day.</li>
<li data-reveal style="--d:2"><strong>Giving yourself “a bit extra” time.</strong> Five kind minutes per mock add up to an exam you’ve never finished at real speed.</li>
<li data-reveal style="--d:3"><strong>Checking the score and closing the tab.</strong> The attempt was data collection. The analysis is where the learning happens.</li>
<li data-reveal style="--d:4"><strong>Re-sitting the same paper the next day.</strong> You’ll remember positions, not methods. Wait a few days and randomise the order.</li>
<li data-reveal style="--d:5"><strong>Trusting an AI-made paper without reading it.</strong> Every tool that reads photos gets things wrong sometimes, and a wrong answer key teaches you the wrong thing with total confidence.</li>
</ol>`,
                    },
                ],
            },
            {
                id: 'honest-limits',
                title: 'What works well, and what to check twice',
                tocLabel: 'Honest limits',
                blocks: [
                    {
                        type: 'html',
                        html: `<p>Clean printed pages, typed PDFs and neat question papers come through very well, including maths in standard notation and papers that mix English and Hindi.</p>
<p>Blurry or tilted photos, faint photocopies, rushed handwriting and dense diagrams with lots of labels are where errors creep in. The AI still tries, and it’s usually close. But “usually close” isn’t good enough for an answer key, which is why the review step exists and why we’d never tell you to skip it.</p>
<p>TestoZa grades objective questions automatically: single and multiple correct, numerical answers and passage-based questions. Long written answers, like a five-mark board question, still need a human reader. Use the online mock for the objective part of your paper, and practise long answers on paper against the clock.</p>
<p>Exam patterns change, too. The timings and marking schemes quoted here were right when we wrote this guide; check the official notice for your year before you copy them into a mock.</p>`,
                    },
                ],
            },
        ],
        steps: STEPS,
        faqs: [
            {
                q: 'How do I create a mock test online for free?',
                a: 'Open TestoZa’s AI test creator, sign in with a free account, and upload a photo, PDF or Word file of your questions or study material. Choose Extract to keep the questions as they are, or Generate to get new questions from the material. Review the draft, set the time limit and marking scheme, and save. You can then take the test yourself or share its link.',
            },
            {
                q: 'Can I make a mock test from a photo of my textbook?',
                a: 'Yes. Take clear, flat photos of the pages, one page per photo, and upload them together. Choose Generate New Questions to get fresh questions on that chapter at Easy, Moderate or Tough difficulty, in English, Hindi or both.',
            },
            {
                q: 'Can I turn an old question paper PDF into an online test?',
                a: 'Yes. Upload the PDF and choose Extract Questions. The questions, options and diagrams are copied as printed. If the answers are on a separate sheet, upload it as the answer key and they are matched automatically. Check each question before saving.',
            },
            {
                q: 'Is the TestoZa exam screen like the real JEE Main exam?',
                a: 'TestoZa tests open by default in an NTA-style interface with a numbered question palette, colour-coded question status, Mark for Review and an on-screen keypad for numerical answers, similar to the computer-based JEE Main. TestoZa is a practice tool and is not affiliated with the NTA.',
            },
            {
                q: 'Can I add negative marking to my mock test?',
                a: 'Yes. Set marks and negative marks for each question or section, for example +4 and −1, or 2 and −0.5. Scores, including the deductions, are calculated automatically when the test is submitted.',
            },
            {
                q: 'Do students need an account to take a mock test?',
                a: 'No. Anyone with the link can open the test in a phone or computer browser, with no app to install. The teacher decides what the start form asks for, such as a name and roll number. Creating tests and using the AI needs a free account.',
            },
            {
                q: 'Are the tests I create private?',
                a: 'Yes. New tests are private, and only the people you share the link with can take them. Keep tests built from copyrighted textbooks private and use them for your own practice.',
            },
            {
                q: 'How long does it take to create a mock test with AI?',
                a: 'Reading a paper or a chapter usually takes a couple of minutes, depending on the number of pages. Allow another five minutes to review the questions and answers before you save.',
            },
            {
                q: 'What is the difference between a mock test and a practice test?',
                a: 'A practice test checks whether you can solve a type of question. A mock test copies the whole exam: the full length, the time limit, the marking scheme including negative marks, and the exam interface. It tells you how you would score on the day.',
            },
        ],
        closingTitle: 'Your next mock test is already on your desk',
        closing: [
            {
                type: 'html',
                html: `<p>It’s the chapter you finished yesterday, the sample paper in your bag, the PDF someone shared in the class group. Photograph it, give it a clock and a marking scheme, and sit it like it counts. Then spend twice as long on the result as you did on the test.</p>
<p class="cmt-cta-row"><a class="cmt-btn cmt-btn--primary" href="/generate-with-ai">Create a mock test free</a> <a class="cmt-btn" href="/create-test">Build one by hand</a></p>
<p class="cmt-more">More ways in: <a href="/pdf-to-quiz">PDF to quiz</a> · <a href="/ai-question-generator">AI question generator</a> · <a href="/online-test-maker">Online test maker</a> · <a href="/auto-grading-software">Auto-grading</a> · <a href="/more-tests">Browse free tests</a> · <a href="/user-guide">User guide</a></p>`,
            },
        ],
        sources: [
            {
                label: 'Roediger, H. L. & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. Psychological Science, 17(3), 249–255.',
                href: 'https://doi.org/10.1111/j.1467-9280.2006.01693.x',
            },
            {
                label: 'Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J. & Willingham, D. T. (2013). Improving students’ learning with effective learning techniques. Psychological Science in the Public Interest, 14(1), 4–58.',
                href: 'https://doi.org/10.1177/1529100612453266',
            },
            { label: 'National Testing Agency (JEE Main exam pattern and interface)', href: 'https://www.nta.ac.in/' },
            { label: 'Staff Selection Commission (SSC CGL scheme of examination)', href: 'https://ssc.gov.in/' },
            { label: 'Union Public Service Commission (Civil Services preliminary examination)', href: 'https://upsc.gov.in/' },
        ],
    },
};
