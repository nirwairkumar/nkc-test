/**
 * testoza.com/best-ai-quiz-generator — twelve AI quiz generators sorted by the job: write
 * new questions from a topic, build a quiz inside a quiz app, or read a teacher's own paper
 * into a timed test. Written for teachers, tuition teachers and coaching institutes.
 *
 * Not the same page as /ai-test-generator (how TestoZa's own generator works, step by step)
 * or /ai-question-generator (TestoZa's landing page). This one is the comparison list.
 *
 * Facts and where they come from (sources in `sources`), checked 5 November 2026:
 *   - Wayground (help centre, "Wayground AI: Generate Assessments from Prompts, Documents,
 *     Videos, & More"): PDF, PPT, PPTX, DOC, DOCX, JPG, PNG, one file at a time, only the
 *     first 16,000 characters of a file processed, typed text capped at 10,000 characters;
 *     public web pages; public YouTube links; photos of worksheets in the mobile app;
 *     US standards for maths and science. Which plan includes what is not stated there.
 *   - Kahoot (help centre and plans page): AI question generator and PDF-to-kahoot
 *     generator; the PDF tool reads up to about 150 pages on higher Kahoot!+ tiers, fewer on
 *     lower ones; free accounts are limited. Exact tier mapping unclear, so the page says
 *     "depends on your plan".
 *   - Google Forms (Workspace Updates blog, 30 July 2026; Google help): "Help me create"
 *     now generates quizzes with correct answers and points, using Docs, Sheets, Slides or
 *     PDFs you reference; Business Standard/Plus, Enterprise Standard/Plus, Education Plus
 *     and eligible Google AI plans; forms with several sections not supported.
 *   - Microsoft Forms (Microsoft support, Tech Community): Copilot drafts quizzes from your
 *     files or pasted text with answers; needs a Microsoft 365 account and a Copilot licence.
 *   - MagicSchool (help centre): 80+ teacher tools including a multiple-choice quiz maker;
 *     free tier has usage limits on AI generations. No price quoted (third-party figures vary).
 *   - Questgen (questgen.ai/pricing): free 20 runs; Pro $15 a month or $100 a year, unlimited
 *     (fair use); MCQ, true/false, fill-in-the-blank, matching, higher-order (Bloom's)
 *     questions; text, URLs, PDFs, images, video; export AIKEN and Respondus.
 *   - PrepAI (prepai.io/pricing): DataToBiz Pvt Ltd, Mohali; Free 30 quizzes a month; Annual
 *     ₹19,999 (250 a month); Lifetime ₹49,999; pay as you go ₹15 a credit; text, topic, URL,
 *     document, video, audio (up to 2,500 words); Bloom's levels; export PDF, Word, Excel,
 *     JSON and to Canvas, Moodle, Google Classroom and other LMSs.
 *   - Conker (conker.ai): quizzes with several question types, US standards (NGSS, TEKS),
 *     export to Google Forms, share from Canvas, read-aloud on every quiz.
 *   - Teachmint EduAI and Testportal's AI question generator: as checked for
 *     teachmintAlternative.ts and testportalAlternative.ts (October 2026).
 *   - ChatGPT, Gemini, Claude: general chatbots; described by what any of them does, with no
 *     plan or price claims (those change monthly).
 *
 * TestoZa claims: see comparisonData.ts header (PDFs and pictures only, Extract never
 * guesses, Generate at three levels, languages, typeset equations, cropped diagrams,
 * "Needs answer" filter, 30 runs an hour, free plan). Never claim YouTube, web pages,
 * Word/PowerPoint files or a typed topic as inputs.
 */
import { COMPARISON_PAGES } from './comparisonData';
import { compareFallback, scenariosFallback, stepsFallback } from './howtoFallback';
import { AI_QUIZ_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const P = COMPARISON_PAGES.aiQuiz;

export const BEST_AI_QUIZ_GENERATOR: Guide = {
    meta: AI_QUIZ_META,
    body: {
        intro: [
            html(`
<p>Two years ago, “AI quiz generator” meant a handful of specialist tools. Now nearly every quiz app has an AI button, Google Forms and Microsoft Forms have one built in, and any chatbot will write twenty multiple-choice questions on photosynthesis in ten seconds. Writing questions has stopped being the hard part.</p>
<p>The hard part is everything around the questions. Is the answer key right? Did the equation survive? Will it read a page in Hindi? And when the AI has finished, do you have a test students can sit tonight, or a block of text you now have to paste somewhere, one question at a time?</p>
<p>This guide compares twelve AI quiz generators on those questions. It sorts them by the job they do, because a tool that writes new questions on any topic and a tool that reads your own question paper are solving different problems. We make <a href="/">TestoZa</a>, which is on this list, so every other tool is described from its own website and help pages, and the guide says plainly which jobs other tools do better.</p>
`),
        ],

        answer:
            'The best AI quiz generator depends on what you start with. If you have your own material, such as past papers, a chapter PDF or a photo of a textbook page, use a tool that reads it: TestoZa extracts the questions with their answer key, equations and diagrams, or generates new ones from the pages, and turns them into a timed test with negative marking and a rank list, free. If you only have a topic, ChatGPT, Gemini or a teacher tool such as MagicSchool or Questgen will write questions, which you must check. If your school runs on Google Workspace or Microsoft 365, the AI in Google Forms or Microsoft Forms may already be included. For a class game, Wayground or Kahoot. Whatever you use, check every answer the AI decided by itself.',

        sections: [
            {
                id: 'at-a-glance',
                title: 'The twelve tools at a glance',
                tocLabel: 'At a glance',
                kicker: 'The list',
                blocks: [
                    html(`
<p>Grouped by what the AI does. The numbers match the reviews below. They are not scores.</p>
<div class="al-table-wrap al-table-wrap--wide"><table class="al-table">
<thead><tr><th scope="col">Tool</th><th scope="col">Best for</th><th scope="col">Reads</th><th scope="col">Price</th></tr></thead>
<tbody>
<tr><th scope="row" class="al-us">1. TestoZa</th><td data-label="Best for" class="al-us">Turning your own papers and pages into timed tests</td><td data-label="Reads" class="al-us">PDFs and photos, printed or handwritten</td><td data-label="Price" class="al-us">AI on the free plan</td></tr>
<tr><th scope="row">2. ChatGPT, Gemini, Claude</th><td data-label="Best for">Questions on any topic, in any style</td><td data-label="Reads">Text, files and pictures you attach</td><td data-label="Price">Free tiers; paid plans for more use</td></tr>
<tr><th scope="row">3. Google Forms (Gemini)</th><td data-label="Best for">Schools on Google Workspace</td><td data-label="Reads">A prompt, plus Docs, Sheets, Slides or PDFs in Drive</td><td data-label="Price">Included in eligible paid Workspace plans</td></tr>
<tr><th scope="row">4. Microsoft Forms (Copilot)</th><td data-label="Best for">Schools on Microsoft 365</td><td data-label="Reads">Your files or pasted text</td><td data-label="Price">Needs a Copilot licence</td></tr>
<tr><th scope="row">5. Wayground</th><td data-label="Best for">Self-paced class games from your material</td><td data-label="Reads">PDF, Word, PowerPoint, pictures, web pages, YouTube</td><td data-label="Price">Free Basic plan; AI limits by plan</td></tr>
<tr><th scope="row">6. Kahoot</th><td data-label="Best for">A live game from a PDF</td><td data-label="Reads">A topic or a PDF</td><td data-label="Price">PDF tool on paid Kahoot!+ plans</td></tr>
<tr><th scope="row">7. MagicSchool</th><td data-label="Best for">Many teacher tools in one place</td><td data-label="Reads">A topic or text</td><td data-label="Price">Free tier with usage limits</td></tr>
<tr><th scope="row">8. Questgen</th><td data-label="Best for">Question types and exports for other systems</td><td data-label="Reads">Text, URLs, PDFs, pictures, video</td><td data-label="Price">20 free runs; $15 a month or $100 a year</td></tr>
<tr><th scope="row">9. PrepAI</th><td data-label="Best for">Bloom’s-level questions with LMS export, priced in rupees</td><td data-label="Reads">Text, topics, URLs, documents, video, audio</td><td data-label="Price">30 quizzes a month free; ₹19,999 a year</td></tr>
<tr><th scope="row">10. Conker</th><td data-label="Best for">US school standards, export to Google Forms</td><td data-label="Reads">A topic or your text</td><td data-label="Price">Free to try</td></tr>
<tr><th scope="row">11. Teachmint EduAI</th><td data-label="Best for">Schools already on Teachmint</td><td data-label="Reads">A topic</td><td data-label="Price">Part of Teachmint’s quote</td></tr>
<tr><th scope="row">12. Testportal</th><td data-label="Best for">Training and certification tests</td><td data-label="Reads">A topic or text</td><td data-label="Price">Inside Testportal’s plans</td></tr>
</tbody>
</table></div>
<p class="al-note">AI features and limits change faster than any other part of these products. Everything here is from each company’s own pages, checked 5 November 2026.</p>
`),
                ],
            },
            {
                id: 'three-jobs',
                title: 'Three different jobs called “AI quiz generator”',
                tocLabel: 'Three jobs',
                kicker: 'Method',
                blocks: [
                    html(`
<p>Before comparing tools, separate the jobs. Most disappointment with AI quiz tools comes from using one built for a different job.</p>
<ol class="al-list al-list--num">
<li><strong>Write new questions.</strong>You give a topic or some text; the AI writes questions it thinks fit. Good when you have no questions yet. The answer key is the AI’s own judgement.</li>
<li><strong>Build a quiz inside a quiz app.</strong>The AI writes questions straight into Google Forms, Microsoft Forms, Wayground or Kahoot, so you skip the copying. Good when the app is where your class already is. You get that app’s scoring: usually no negative marking.</li>
<li><strong>Read the questions you already have.</strong>You give a past paper, a sample paper or a photo of an exercise page, and the AI reads those exact questions, options and answers into a test. Good when your best questions already exist, which, for most Indian teachers, they do: in old papers, DPPs and guide books.</li>
</ol>
<p>We checked each tool on six things: what it reads, where its answer key comes from, what happens to maths and diagrams, whether it handles Hindi or two languages, what you have when it finishes, and what it costs.</p>
`),
                ],
            },
            {
                id: 'chatbot-vs-generator',
                title: 'A chatbot and a test generator, side by side',
                tocLabel: 'Chatbot vs generator',
                kicker: 'The big split',
                blocks: [
                    html(`
<p>Most teachers’ first AI quiz generator is a chatbot. Here is how that compares with a tool built to produce a test.</p>
`),
                    { type: 'widget', widget: 'hw-compare', fallbackHtml: compareFallback(P) },
                ],
            },
            {
                id: 'which-one',
                title: 'Which one fits your job: six situations',
                tocLabel: 'Which one fits you',
                kicker: 'Your situation',
                blocks: [
                    html(`
<p>Pick the situation closest to yours.</p>
`),
                    { type: 'widget', widget: 'hw-scenarios', fallbackHtml: scenariosFallback(P) },
                ],
            },
            {
                id: 'reviews-tests',
                title: 'Generators that end in a test',
                tocLabel: 'Reviews 1–2',
                kicker: 'Reviews 1–2',
                blocks: [
                    html(`
<h3>1. TestoZa: best for turning your own papers into tests</h3>
<p>TestoZa is an online test platform for Indian teachers and coaching institutes, and its AI is built for the third job: reading what you already have. You upload PDFs or photos of pages, printed or handwritten, several at once, and choose one of two modes. <strong>Extract</strong> reads the questions that are on the page, with their options and the answer key if the paper has one. It never guesses an answer: a question without one is listed under “Needs answer” for you to fill in. <strong>Generate</strong> writes new questions from the pages you give it, at Easy, Moderate or Tough.</p>
<p>Equations come out as typeset maths, not plain text, and diagrams are cropped from the page and attached to their question. Questions can be in the material’s own language, in English, in Hindi, or in two languages side by side. Everything lands on a review screen first, where you can search, edit and generate more before saving.</p>
<p>What makes it different from a chatbot is what happens next: the questions are already a test. You set marks and negative marks (+4/−1 or any other), sections and a timer, then share a link or a six-digit code that students open on any phone without an app or account. Results come back as a rank list with topic-wise analysis.</p>
<ul class="al-list">
<li><strong>Best for</strong>Teachers and institutes with past papers, sample papers, DPPs or textbook exercises who want a test students can sit today.</li>
<li><strong>Watch out for</strong>It reads PDFs and pictures only: no YouTube, web pages or typed topics, and Word or PowerPoint files have to be saved as PDF first. Limited to 30 AI runs an hour per account.</li>
<li><strong>Price</strong>The AI is on the free plan. Paid plans, for extra exam rules, are ₹49 for 7 days, ₹149 for 30 days or ₹799 a year. See <a href="/pricing">pricing</a> and <a href="/ai-test-generator">how the AI test generator works</a>.</li>
</ul>

<h3>2. ChatGPT, Gemini and Claude: best for questions on any topic</h3>
<p>General chatbots are the most flexible question writers there are. Ask for ten assertion–reason questions on electrostatics, a case study on the French Revolution in simple English, or the same five questions in Hindi, and they will do it in seconds. They can also read a file or a picture you attach.</p>
<p>Their limits are about trust and work. The model decides the right answer itself, and it is sometimes confidently wrong, most often in multi-step maths and numericals. Equations come back as plain text or code. And at the end you have text in a chat window, which you then copy into a form or quiz app and set up there.</p>
<ul class="al-list">
<li><strong>Best for</strong>Drafting questions when you have no material, and rewording or translating questions you have.</li>
<li><strong>Watch out for</strong>Check every answer yourself. Ask it to show its working on numericals, and solve them anyway.</li>
<li><strong>Price</strong>Free tiers with limits; paid plans for heavier use.</li>
</ul>
`),
                ],
            },
            {
                id: 'reviews-apps',
                title: 'AI built into quiz and form apps',
                tocLabel: 'Reviews 3–6',
                kicker: 'Reviews 3–6',
                blocks: [
                    html(`
<p>These four put the questions straight into the app your students already use. The trade-off is that you also get that app’s marking and screen.</p>

<h3>3. Google Forms with Gemini: best for Google Workspace schools</h3>
<p>Since July 2026, “Help me create” in Google Forms can build a whole quiz from a prompt, using Docs, Sheets, Slides or PDFs from your Drive, with correct answers marked and points set. For a school that already marks everything in Google Classroom, that is a big time saver. It needs an eligible paid plan (Google lists Business Standard and Plus, Enterprise, and Education Plus, among others), and it doesn’t yet work with forms that have several sections. The quiz is still a Google Form: no built-in countdown timer and no negative marking.</p>
<ul class="al-list">
<li><strong>Best for</strong>Schools on Google Workspace with an eligible plan.</li>
<li><strong>Watch out for</strong>Not on free personal accounts; no timer or negative marks in Forms itself.</li>
<li><strong>Price</strong>Included in eligible Workspace and Google AI plans.</li>
</ul>

<h3>4. Microsoft Forms with Copilot: best for Microsoft 365 schools</h3>
<p>Copilot in Microsoft Forms drafts a quiz from your own files or pasted text, with answers. Microsoft Forms already has a quiz timer, which Google Forms lacks. It needs a Microsoft 365 account and a Copilot licence.</p>
<ul class="al-list">
<li><strong>Best for</strong>Schools on Microsoft 365 that already pay for Copilot.</li>
<li><strong>Watch out for</strong>The Copilot licence; no negative marking.</li>
<li><strong>Price</strong>Part of a Copilot licence.</li>
</ul>

<h3>5. Wayground: best for games from any material</h3>
<p>Wayground, formerly Quizizz, reads the widest range of material on this list: PDF, Word and PowerPoint files, pictures, a public web page, a public YouTube video, or a photo of a worksheet from its mobile app. Two limits are worth knowing from its help centre: it takes one file at a time, and it reads only the first 16,000 characters of a file, which is roughly six to eight pages of text. The result is a Wayground activity that students play at their own pace.</p>
<ul class="al-list">
<li><strong>Best for</strong>Turning a lesson, a video or a handout into a self-paced class game.</li>
<li><strong>Watch out for</strong>Long papers are cut at 16,000 characters. Check which AI features your plan includes.</li>
<li><strong>Price</strong>Free Basic plan for teachers; more on paid plans.</li>
</ul>

<h3>6. Kahoot: best for a live game from a PDF</h3>
<p>Kahoot’s AI writes questions from a topic, and its PDF-to-kahoot tool turns a document into a game. The PDF tool is on paid Kahoot!+ plans, and how many pages it reads depends on the tier, up to about 150 pages on the higher ones. The result is a Kahoot game, with Kahoot’s speed-based scoring. More in our <a href="/kahoot-alternative">Kahoot alternative guide</a>.</p>
<ul class="al-list">
<li><strong>Best for</strong>A fast, loud revision game built from your notes.</li>
<li><strong>Watch out for</strong>Free accounts are limited; points depend on speed.</li>
<li><strong>Price</strong>Paid Kahoot!+ plans for the PDF tool.</li>
</ul>
`),
                ],
            },
            {
                id: 'reviews-teacher',
                title: 'Specialist question generators for teachers',
                tocLabel: 'Reviews 7–12',
                kicker: 'Reviews 7–12',
                blocks: [
                    html(`
<h3>7. MagicSchool: best as a teacher’s AI toolbox</h3>
<p>MagicSchool bundles more than 80 AI tools for teachers, from lesson plans to rubrics, and one of them is a multiple-choice quiz maker. If you want one place for all your AI help, it is a good fit. The free tier has usage limits on AI generations. The questions come out as text to use elsewhere.</p>
<ul class="al-list">
<li><strong>Best for</strong>Teachers who want many AI tools in one account.</li>
<li><strong>Watch out for</strong>No test-taking or marking of its own.</li>
<li><strong>Price</strong>Free tier with limits; paid plans for more.</li>
</ul>

<h3>8. Questgen: best for question types and exports</h3>
<p>Questgen writes multiple-choice, true or false, fill-in-the-blank, matching and “higher-order” questions built on Bloom’s taxonomy, from text, web pages, PDFs, pictures or video. Its exports in AIKEN and Respondus formats make it useful if your tests live in Moodle or another LMS.</p>
<ul class="al-list">
<li><strong>Best for</strong>Teachers who need varied question types to import into an LMS.</li>
<li><strong>Watch out for</strong>The free plan is 20 runs in total.</li>
<li><strong>Price</strong>Pro is $15 a month or $100 a year, unlimited within fair use.</li>
</ul>

<h3>9. PrepAI: best Indian-built generator with LMS export</h3>
<p>PrepAI, made by DataToBiz in Mohali, generates quizzes from text, topics, web pages, documents, video and audio, labels questions by Bloom’s level, and exports to PDF, Word, Excel and LMSs including Moodle, Canvas and Google Classroom. It prices in rupees and has a real free plan.</p>
<ul class="al-list">
<li><strong>Best for</strong>Institutes that want generated question sets to export into their own system.</li>
<li><strong>Watch out for</strong>Material-based quizzes read up to about 2,500 words at a time.</li>
<li><strong>Price</strong>Free, 30 quizzes a month; ₹19,999 a year for 250 a month; ₹49,999 for life; or ₹15 a credit.</li>
</ul>

<h3>10. Conker: best for US school standards</h3>
<p>Conker builds quizzes with several question types, offers ready-made assessments aligned to US standards such as NGSS and TEKS, reads every quiz aloud, and exports to Google Forms or shares from Canvas. It is built around American schools.</p>
<ul class="al-list">
<li><strong>Best for</strong>Teachers following US standards who mark in Google Forms.</li>
<li><strong>Watch out for</strong>Indian boards and entrance exams aren’t its focus.</li>
<li><strong>Price</strong>Free to try; see its pricing page.</li>
</ul>

<h3>11. Teachmint EduAI: best for Teachmint schools</h3>
<p>Teachmint’s EduAI generates quizzes and homework inside Teachmint’s school platform, which now leads with classroom panels and devices. It makes sense if your school is already a Teachmint customer. More in our <a href="/teachmint-alternative">Teachmint alternative guide</a>.</p>

<h3>12. Testportal: best for business training tests</h3>
<p>Testportal has an AI question generator inside a well-built assessment tool aimed mostly at companies, training and certification. Its interface is in English and Polish. More in our <a href="/testportal-alternative">Testportal alternative guide</a>.</p>
`),
                ],
            },
            {
                id: 'india',
                title: 'What Indian teachers should test before trusting any of them',
                tocLabel: 'Indian papers',
                kicker: 'The hard pages',
                blocks: [
                    html(`
<p>Most AI quiz tools are demonstrated on a page of plain English text, which every one of them handles well. Indian papers are harder, and these are the pages that separate the tools:</p>
<ul class="al-list">
<li><strong>Maths and science.</strong>Fractions, roots, integrals, chemical equations and units. Check whether they come back as readable maths or as code you have to fix.</li>
<li><strong>Diagrams.</strong>Circuit diagrams, graphs and structures that a question depends on. Does the diagram stay with its question?</li>
<li><strong>Answer keys at the back.</strong>Many papers print the key on the last page. Does the tool match it to the questions, or decide answers itself?</li>
<li><strong>Hindi and two languages.</strong>Bilingual papers are normal for state exams, SSC and many schools. Try a Hindi page, including one typed in an old Kruti Dev font.</li>
<li><strong>Exam patterns.</strong>Multiple-correct questions, numerical answers, assertion–reason, passages with several questions. And at the end: can the test carry +4/−1?</li>
<li><strong>Scanned and handwritten pages.</strong>A photo of a guide book page taken on a phone, slightly skewed, with a shadow.</li>
</ul>
<p>Run your hardest page through two or three tools and count the wrong answer keys. That one number will tell you more than this whole list. Our <a href="/math-test-maker">maths</a>, <a href="/chemistry-question-paper-maker">chemistry</a> and <a href="/hindi-online-test-maker">Hindi</a> guides show what good output looks like for each.</p>
`),
                ],
            },
            {
                id: 'trial',
                title: 'How to choose: a 30-minute test, and when TestoZa is the wrong pick',
                tocLabel: 'Trial and limits',
                kicker: 'Before you decide',
                blocks: [
                    html(`
<p>Run the same check on every tool you are considering, TestoZa included:</p>
${stepsFallback(P)}
<h3>When TestoZa is the wrong pick</h3>
<p>We would rather you used the right tool than ours. TestoZa’s AI is not the best choice if:</p>
<ul class="al-limits">
<li><strong>Your material is a video or a web page.</strong> TestoZa reads PDFs and pictures only. Wayground takes YouTube links and web pages.</li>
<li><strong>You have only a topic and no material.</strong> A chatbot or MagicSchool writes from a topic; TestoZa generates from pages you give it.</li>
<li><strong>You want a class game.</strong> Wayground or Kahoot turn the questions into a game; TestoZa makes a test.</li>
<li><strong>Your quizzes must live in your LMS.</strong> Questgen and PrepAI export to Moodle, Canvas and others; TestoZa runs the test itself.</li>
</ul>
<p>And if you have past papers and want a timed, marked test from them tonight, that is the job TestoZa was built for. See <a href="/ai-test-generator">how the AI test generator works</a> or try it on <a href="/generate-with-ai">your own PDF</a>.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'What is the best AI quiz generator?',
                a: 'It depends on your material. To turn your own past papers, PDFs or textbook photos into a timed test, TestoZa. To write questions from a topic, ChatGPT, Gemini or MagicSchool. For Google or Microsoft schools, the AI in Google Forms or Microsoft Forms. For a class game, Wayground or Kahoot. For exports into an LMS, Questgen or PrepAI.',
            },
            {
                q: 'Is there a free AI quiz generator?',
                a: 'Yes. TestoZa’s AI is on its free plan, limited to 30 runs an hour. ChatGPT and Gemini have free tiers. PrepAI gives 30 quizzes a month free, Questgen 20 runs, and MagicSchool and Wayground have free plans with limits. AI in Google Forms and Microsoft Forms needs eligible paid plans.',
            },
            {
                q: 'Which AI quiz generator can make a quiz from a PDF?',
                a: 'TestoZa (PDFs and photos, several at once, with equations and diagrams), Wayground (one file at a time, first 16,000 characters), Kahoot (on paid Kahoot!+ plans), Google Forms with Gemini (PDFs in Drive), Questgen and PrepAI. ChatGPT, Gemini and Claude read attached PDFs too.',
            },
            {
                q: 'Can ChatGPT make a quiz?',
                a: 'Yes, quickly and on any topic. But it decides the answers itself and is sometimes wrong, especially in maths; equations come back as plain text; and you then copy the questions into a form or quiz app. Check every answer before students see it.',
            },
            {
                q: 'Which AI quiz generator works in Hindi?',
                a: 'TestoZa can output questions in the material’s own language, English, Hindi, or two languages side by side, and reads Hindi papers including older Kruti Dev PDFs. General chatbots also write Hindi on request. Try your own Hindi page in any tool before relying on it.',
            },
            {
                q: 'How accurate are AI-generated answer keys?',
                a: 'When the AI decides answers itself, it is usually right and sometimes confidently wrong, most often in multi-step numericals. Tools that read your paper’s own key avoid that: TestoZa’s Extract mode never guesses and flags questions without an answer under “Needs answer”. Either way, check before you share.',
            },
            {
                q: 'Can an AI quiz generator make questions with negative marking?',
                a: 'The marking is set by the app the quiz runs in, not by the AI. Google Forms, Microsoft Forms, Kahoot and Wayground don’t have negative marking. In TestoZa you set Marks and Wrong on each question, so +4/−1, −0.25 or −1/3 all work after the AI fills the test.',
            },
            {
                q: 'Can AI generate a quiz from a YouTube video?',
                a: 'Wayground takes a public YouTube link, and Questgen and PrepAI accept video. TestoZa doesn’t read videos; take screenshots of the key slides or use the lesson’s notes as a PDF instead.',
            },
            {
                q: 'Is this comparison biased because TestoZa wrote it?',
                a: 'We make TestoZa, so read it with that in mind. Every other tool is described from its own website and help pages, checked on 5 November 2026, and the guide names four jobs where another tool is the better pick, including videos, topic-only questions and class games.',
            },
        ],

        closingTitle: 'Try it on your hardest page.',
        closing: [
            html(`
<p>Take the page your students find hardest, with an equation and a diagram, and see what each tool makes of it. If you start with TestoZa:</p>
<div class="al-paths">
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Have a PDF or a photo?</span><span class="al-path-what">Extract the questions, or generate new ones</span></a>
<a class="al-path" href="/create-test" data-icon="pencil"><span class="al-path-who">Want to set it up first?</span><span class="al-path-what">Build a test with your own marking</span></a>
<a class="al-path" href="/ai-test-generator" data-icon="key"><span class="al-path-who">Want the details?</span><span class="al-path-what">How the AI test generator works</span></a>
</div>
<p>Related reading: <a href="/math-test-maker">maths test maker</a>, <a href="/hindi-online-test-maker">Hindi online test maker</a>, <a href="/kahoot-alternative">Kahoot alternative</a>, <a href="/best-online-exam-software-india">best online exam software in India</a> and <a href="/guides">all guides</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Google Forms and Microsoft Forms',
                links: [
                    { label: 'Gemini in Google Forms creates quizzes (July 2026)', href: 'https://workspaceupdates.googleblog.com/2026/07/use-gemini-in-google-forms-to-quickly-create-a-new-quiz.html' },
                    { label: 'Create a form with Gemini', href: 'https://support.google.com/docs/answer/16346789' },
                    { label: 'Create quizzes with Copilot in Forms', href: 'https://techcommunity.microsoft.com/blog/microsoftformsblog/create-quizzes-with-copilot-in-forms/4193986' },
                ],
            },
            {
                label: 'Wayground and Kahoot',
                links: [
                    {
                        label: 'Wayground AI: generate from prompts, documents, videos',
                        href: 'https://help.wayground.com/support/solutions/articles/158000405091-wayground-ai-generate-assessments-from-prompts-documents-videos-more',
                    },
                    { label: 'How to use Kahoot! AI tools', href: 'https://support.kahoot.com/hc/articles/17152945038355' },
                    { label: 'Kahoot! plans for schools', href: 'https://kahoot.com/schools/plans/' },
                ],
            },
            {
                label: 'Teacher tools',
                links: [
                    { label: 'MagicSchool help centre', href: 'https://help.magicschool.ai/en/articles/10186047-important-terms-definitions' },
                    { label: 'Questgen pricing', href: 'https://www.questgen.ai/pricing' },
                    { label: 'PrepAI pricing', href: 'https://www.prepai.io/pricing' },
                    { label: 'Conker', href: 'https://www.conker.ai/' },
                ],
            },
            {
                label: 'Teachmint and Testportal',
                links: [
                    { label: 'Teachmint website', href: 'https://www.teachmint.com/' },
                    { label: 'Testportal website', href: 'https://www.testportal.net/' },
                ],
            },
            {
                label: 'TestoZa',
                links: [
                    { label: 'AI test generator guide', href: 'https://testoza.com/ai-test-generator' },
                    { label: 'Pricing', href: 'https://testoza.com/pricing' },
                ],
            },
        ],
    },
};
