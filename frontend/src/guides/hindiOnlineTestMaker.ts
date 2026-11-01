/**
 * testoza.com/hindi-online-test-maker — making online tests in Hindi: what a Hindi
 * test maker has to get right, typing Hindi in English letters, bringing existing
 * Hindi papers in (and the Kruti Dev trap), Hindi / English / bilingual papers,
 * what students see on their phones, formulas and numerals, competitive-exam
 * coaching, Google Forms, mistakes and honest limits, with a summary in Hindi.
 * Written for Hindi-medium teachers and coaching institutes, TestoZa as the example.
 *
 * Outside facts (sources in `sources`, checked 3 October 2026):
 *   - Census 2011: 52.83 crore people (43.63 %) returned Hindi as mother tongue; the
 *     figure groups several related mother tongues under Hindi.
 *   - NEET-UG: Hindi-medium candidates get a bilingual (Hindi + English) booklet; the
 *     English version is final if translations differ. SSC CGL Tier 1: Hindi and
 *     English except English Comprehension, 100 questions, 60 min, +2/−0.5. RRB NTPC
 *     CBT 1: 15 languages, 100 questions, 90 min, −1/3. CTET: Hindi and English,
 *     150 questions, 150 min, no negative marking.
 *   - Constitution, Article 343(1): the international form of Indian numerals for the
 *     Union's official purposes. Windows: Hindi Phonetic IME (Microsoft docs). Mukta:
 *     Ek Type, Devanagari + Latin (Google Fonts). Kruti Dev / Chanakya / DevLys are
 *     legacy non-Unicode fonts that store Latin characters.
 *
 * TestoZa claims checked against the code on 3 October 2026:
 *   - Hindi typing: components/ui/IMEInput.tsx + test-builder/QuestionCard.tsx. An
 *     English | हिंदी switch on each card (question, options, passage) and on the test
 *     description and the test name. On space, a word made only
 *     of letters goes to Google Input Tools; the first suggestion replaces it and up to
 *     five show in a bar until the next letter is typed. Capitals make no difference.
 *     New cards take the last language used (TestBuilder lastTypingMode). Needs the
 *     internet ("Hindi typing needs the internet" banner).
 *   - Fill from photo (backend ai.py /ai/read-question): copies wording, sets the card to
 *     Hindi when the question is Hindi, maps (क) labels to A–D, reads "उत्तर: ग" or a mark
 *     as the answer and never works it out, drops "प्रश्न 5".
 *   - AI import (AITestImporter.tsx, pdf_vision_pipeline.build_prompt): Language Output
 *     Same as Material / English / Hindi, several for bilingual; bilingual fields are
 *     "first language \n second language", in the order selected. PDFs and images only;
 *     the hybrid pipeline sends a text-rich PDF page's text layer, except pages whose text
 *     looks like a legacy Hindi font (ai_preview_importer/legacy_fonts.py), which go as
 *     pictures like scanned pages. Word/PowerPoint files are refused in the picker with
 *     a "Save As → PDF" message.
 *   - Exam screen (TestPage.tsx): body font Mukta (index.css); text size − / + at the top
 *     right of the question, 12–32 px, 18 by default, options 2 px smaller (min 14);
 *     numerical answers accept 0–9 from the on-screen keypad. No Hindi UI (no i18n).
 *   - NOT in the product: an exam-screen language switch, conversion of pasted Kruti Dev text, other AI
 *     output languages, Hindi option letters, essays. Don't claim them.
 */
import { HINDI_META } from './meta';
import { EXAM_LANGUAGES, FIRST_GUESSES, PAPER, QUESTIONS, SPELLINGS } from './hindiData';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const TYPING_FALLBACK = `
<p>A working copy of the question card from TestoZa’s test builder. The card has a question type, an English | हिंदी switch, the question box, Fill from photo, Picture and Maths &amp; symbols buttons, Marks and Wrong, and four options. With the switch on हिंदी, type a word in English letters and press space: “nimnalikhit” becomes निम्नलिखित, “mein” becomes में, and so on, until the stem reads “निम्नलिखित में से कौन सा कथन सत्य है”. After each word a bar above the text shows up to five suggestions, such as काम, कम and कॉम for “kam”; tapping one replaces the word. The demo uses the same transliteration service as TestoZa, with a built-in list of the example words if the service can’t be reached.</p>`;

const UNICODE_FALLBACK = `
<p>A checker for text copied from an old Hindi file. Paste a line and it reports whether it is Unicode Hindi (safe to paste into any online test), text from a legacy font such as Kruti Dev, Chanakya or DevLys (stored as English letters, so “भारत की राजधानी” arrives as “Hkkjr dh jkt/kkuh”), or English. It also shows the line as students would see it in TestoZa’s exam font, and what to do next: paste it as it is, convert it to Unicode first, or upload the PDF or photos of the paper instead.</p>`;

const AI_LANGUAGE_FALLBACK = `
<p>A replay of TestoZa’s AI import with two sources, an English textbook page on spherical mirrors and a photo of a printed Hindi question paper, and the Language Output setting: Same as Material, English, Hindi, or English and Hindi together. Same as Material keeps each source’s language. Hindi turns the English page into Hindi-medium questions, for example “किसी गोलीय दर्पण की वक्रता त्रिज्या 20 सेमी है। इसकी फोकस दूरी कितनी है?”. English and Hindi together writes every question and option in both, one under the other, in the order the languages were selected. From the Hindi paper, options labelled (क) to (घ) come back as A to D, and the printed “उत्तर: (ग)” sets the correct answer.</p>`;

const EXAM_FALLBACK = `
<p>TestoZa’s exam screen on a phone, with six questions from “${PAPER.title}” (${PAPER.titleEn}), +${PAPER.right} for a right answer and −${PAPER.wrong} for a wrong one. The question and options are in Hindi in the Mukta typeface; the buttons are Back, Clear, a flag, Save &amp; Next and Submit Test. The faint − and + at the top right of the question change the text size from 12 to 32 pixels. The same paper can be shown bilingual, with each question and option in Hindi and English, one under the other. The first question reads “${QUESTIONS[0].hi.text}” with the options “${QUESTIONS[0].hi.options.A}”, “${QUESTIONS[0].hi.options.B}”, “${QUESTIONS[0].hi.options.C}” and “${QUESTIONS[0].hi.options.D}”.</p>`;

const SPELLING_ROWS = SPELLINGS.map((s) => `<tr><th scope="row"><code>${s.roman}</code></th><td data-label="You get" lang="hi">${s.hindi}</td><td data-label="Why">${s.note}</td></tr>`).join('\n');

const GUESS_ROWS = FIRST_GUESSES.map(
    (g) => `<tr><th scope="row"><code>${g.typed}</code></th><td data-label="First guess" lang="hi">${g.got}</td><td data-label="You meant" lang="hi">${g.meant}</td><td data-label="Fix">${g.fix}</td></tr>`,
).join('\n');

const EXAM_ROWS = EXAM_LANGUAGES.map((e) => `<tr><th scope="row">${e.exam}</th><td data-label="Paper">${e.language}</td><td data-label="Pattern">${e.pattern}</td></tr>`).join('\n');

export const HINDI_ONLINE_TEST_MAKER: Guide = {
    meta: HINDI_META,
    body: {
        intro: [
            html(`
<p>Ask a Hindi-medium teacher why their tests are still on paper and the answer is rarely the questions. It’s the typing. Most online test makers assume an English keyboard and an English paper, so Hindi ends up as screenshots, or in a Kruti Dev file that turns into “Hkkjr dh jkt/kkuh” the moment it leaves the computer it was typed on.</p>
<p>That leaves a lot of people out. The 2011 Census counted 52.8 crore people, 43.6% of India, under Hindi as their mother tongue, and the national exams Hindi-medium students sit (NEET, SSC, the railway exams, CTET) print their papers in Hindi as well as English. A test maker that handles Hindi badly isn’t a small annoyance for those students. It’s the reason they practise on photocopies.</p>
<p>This guide covers what “works in Hindi” has to mean, then the practical parts: typing Hindi on an ordinary keyboard, bringing an existing Hindi paper in without retyping it, choosing a Hindi, English or bilingual paper, and checking what students will actually see on their phones. TestoZa is the worked example because every step can be tried on this page; the advice holds whatever tool you use. There’s a short summary in Hindi near the end.</p>
`),
        ],

        answer: 'A Hindi online test maker has to do four things well: let you type Hindi on an ordinary keyboard, store it as Unicode so it looks the same on every phone, bring in the papers you already have, and show students clean Devanagari with every matra in place. In TestoZa, switch a question card to हिंदी and type in English letters: each word becomes Hindi when you press space (“prashn” becomes प्रश्न), with up to five suggestions to choose from. A printed paper can be photographed or uploaded as a PDF, and the AI keeps it in Hindi, translates it, or makes it bilingual with English and Hindi in every question. Students take the test in any phone browser, and with a six-digit join code they don’t need accounts. Making and sharing tests is free. One warning: text typed in Kruti Dev or another old Hindi font isn’t real Hindi to a computer, so convert it to Unicode before you paste it. Uploaded PDFs and photos of such papers are read from the page itself.',

        sections: [
            {
                id: 'basics',
                title: 'What a Hindi test maker has to get right',
                tocLabel: 'The basics',
                kicker: 'Basics',
                blocks: [
                    html(`
<p>Putting Hindi on one screen is easy. Putting it on sixty different phones, with every matra where it belongs, every conjunct joined and the answer key still matching, is where most tools fail. Before you compare any software, check five things:</p>
<ul class="ht-checks">
<li><strong>It stores Unicode Hindi.</strong> Unicode is the standard every phone, browser and search engine understands. Text typed in an old font such as Kruti Dev, Chanakya or DevLys is stored as English letters that only look like Hindi where that font is installed. In an online test, that means gibberish on students’ phones.</li>
<li><strong>You can type Hindi without learning a Hindi keyboard.</strong> Few teachers know the Inscript or Remington layouts. Typing “prashn” and getting प्रश्न is how most people already write Hindi on a computer or on WhatsApp.</li>
<li><strong>It reads the papers you already have.</strong> Years of Hindi papers exist as printed booklets, PDFs and photos. Retyping them is the hour most teachers don’t have, and every retyped paper brings new mistakes.</li>
<li><strong>Hindi looks right on a cheap phone.</strong> A font that splits क्ष into क् and ष, or drops a matra on the wrong letter, makes a question unreadable. The test maker should bring its own Hindi typeface instead of trusting whatever the phone has.</li>
<li><strong>Bilingual papers are normal.</strong> In many classrooms half the batch reads Hindi and half reads English. NEET gives Hindi-medium candidates one booklet with every question in both languages, and your mocks should be able to do the same.</li>
</ul>
<p>Two more things matter in science and maths: Hindi words and formulas in the same question, and numerical answers a phone can enter without a Hindi keyboard getting in the way. Both are covered below, after typing and importing.</p>
`),
                ],
            },
            {
                id: 'typing',
                title: 'Type Hindi in English letters',
                tocLabel: 'Typing Hindi',
                kicker: 'Typing',
                blocks: [
                    html(`
<p>The quickest way to type Hindi on an ordinary keyboard is transliteration: you spell the word the way it sounds, in English letters, and the computer writes it in Devanagari. There is nothing to install and no layout to learn.</p>
<p>In TestoZa, every question card has an <strong>English | हिंदी</strong> switch next to the question type. Switch it to हिंदी and type:</p>
<ol class="ht-steps">
<li><strong>Spell the word in English letters.</strong> “prashn”, “uttar”, “nimnalikhit”. The word stays in English letters while you type it.</li>
<li><strong>Press space.</strong> The word becomes Hindi: प्रश्न, उत्तर, निम्नलिखित. Anything that isn’t a plain word, such as “20”, “3×10⁸” or “m/s”, stays exactly as you typed it.</li>
<li><strong>Pick a better word if the first guess is wrong.</strong> A bar above the text shows up to five suggestions for the word you just finished (काम, कम, कॉम…). Tap the right one before you type the next letter: once you carry on, the bar closes. To change an earlier word, delete it and type it again.</li>
</ol>
<p>The switch works in the question, in every option and in a passage, and the test’s description has one too. New questions start in the language you used last, so once the first card is in Hindi, the rest of the paper follows. Hindi typing uses Google’s transliteration service, the same one behind Google’s own Hindi input, so it needs the internet; if the connection drops, TestoZa tells you, and words stay in English letters until it’s back.</p>
<p>Try it below. This is the question card from TestoZa’s test builder: switch it to हिंदी, then type <code>nimnalikhit mein se kaun sa kathan satya hai</code>, pressing space after each word, or let the demo type it for you.</p>
`),
                    { type: 'widget', widget: 'hindi-typing', fallbackHtml: TYPING_FALLBACK },
                    html(`
<h3>Spellings that get the right word first time</h3>
<p>Most words come out right on the first try, including long ones and conjuncts. These were typed into the same service while this guide was written:</p>
<div class="ht-table-wrap"><table class="ht-table ht-table--spell">
<thead><tr><th scope="col">You type</th><th scope="col">You get</th><th scope="col">Why it works</th></tr></thead>
<tbody>
${SPELLING_ROWS}
</tbody>
</table></div>
<h3>When the first guess is wrong</h3>
<p>Capital letters make no difference: “karan” and “KaraN” give the same suggestions. What helps is spelling the sound out. When a word keeps coming out with a short vowel, double the vowel (aa, ee, oo), or take the second suggestion from the bar:</p>
<div class="ht-table-wrap"><table class="ht-table ht-table--guess">
<thead><tr><th scope="col">You type</th><th scope="col">First guess</th><th scope="col">You meant</th><th scope="col">Fix</th></tr></thead>
<tbody>
${GUESS_ROWS}
</tbody>
</table></div>
<p class="ht-note"><strong>Punctuation and abbreviations.</strong> A word turns into Hindi only when it is all letters. So type the space before the question mark: “hai”, space, backspace, “?” gives है?, while “hai?” typed in one go stays in English letters. English abbreviations are all letters too, so in Hindi mode “SI” becomes सी and “km” becomes कम: switch the card to English for that word, then back. The danda (।) isn’t on an English keyboard; paste it, or type that line on a phone keyboard that has it.</p>
<h3>Other ways to type Hindi</h3>
<p>Whatever you type with, the rule is the same: it must produce Unicode Hindi, not a legacy font. Three options that do:</p>
<ul class="ht-list">
<li><strong>On a phone: a Hindi keyboard.</strong> Gboard on Android and the iPhone’s own Hindi keyboards include layouts where you type in English letters. Hindi typed this way can go into any box.</li>
<li><strong>On Windows: Hindi Phonetic.</strong> Windows 10 and 11 include a Hindi Phonetic keyboard (Settings → Time &amp; language → Language &amp; region → Hindi → Add a keyboard). Windows + Space switches between it and English.</li>
<li><strong>For trained typists: Inscript.</strong> The standard Hindi layout, built into Windows and macOS. Fast once learned, but few teachers have learned it, and it is a different layout from the Remington one that Kruti Dev typists know.</li>
</ul>
`),
                ],
            },
            {
                id: 'import',
                title: 'Already have the paper? Bring it in instead of retyping',
                tocLabel: 'Import a paper',
                kicker: 'Import',
                blocks: [
                    html(`
<p>Most Hindi papers already exist somewhere: a printed booklet, last year’s PDF, a photo a colleague sent on WhatsApp. Retyping them is slow and adds mistakes. TestoZa has two ways to skip it.</p>
<h3>One question: Fill from photo</h3>
<p>Every question card has a <strong>Fill from photo</strong> button. Photograph one printed or handwritten question and TestoZa types it into the card: the question, the options and, if the photo shows it, the answer. It is made for Hindi papers as they are actually printed:</p>
<ul class="ht-list">
<li><strong>Hindi stays Hindi.</strong> The wording is copied, not translated or improved, and the card switches to हिंदी so you can edit it straight away.</li>
<li><strong>Hindi option labels become A to D.</strong> Options printed as (क), (ख), (ग), (घ) are filled in as A, B, C and D, the letters TestoZa’s exam screen uses.</li>
<li><strong>The answer comes only from the photo.</strong> A tick or a circle on an option, or a printed line such as “उत्तर: (ग)”, sets the correct answer. With no such mark, the answer is left for you to tap. The AI never works it out.</li>
<li><strong>Question numbers are dropped,</strong> “प्रश्न 5” included, so the card holds only the question.</li>
</ul>
<h3>A whole paper: Import from PDF or photos</h3>
<p>For a full paper, use <strong>Import from PDF or photos</strong> at the top of the test builder, which opens the <a href="/ai-test-generator">AI test generator</a>. Upload the PDF or photos of the pages, and the answer key as a separate file if you have one. Choose <em>Extract</em> to keep the paper’s own questions, or <em>Generate</em> to have new questions written from a chapter. Leave the language on <em>Same as Material</em> and a Hindi paper comes back in Hindi. Every question then appears on a review screen, where you read it once before it becomes a test. AI import reads PDFs and pictures (PNG, JPG and WEBP), so save a Word file as PDF first.</p>
<h3>The Kruti Dev problem</h3>
<p>This is the trap that catches most Hindi-medium schools. For years, Hindi on Indian office computers was typed in fonts such as Kruti Dev, Chanakya and DevLys. They don’t store Hindi at all. They store ordinary English letters and draw them as Devanagari shapes: the word भारत is saved as “Hkkjr”. On the computer that has the font, it looks perfect. Copy it anywhere else (a website, WhatsApp, a test maker) and the disguise falls off.</p>
<p>For an online test that matters in two places:</p>
<ul class="ht-list">
<li><strong>Pasting: convert first.</strong> Text copied from a Kruti Dev file arrives as “Hkkjr dh jkt/kkuh”, and that is exactly what students would see. Run it through any “Kruti Dev to Unicode” converter before you paste (paste, convert, then check the result).</li>
<li><strong>Uploading: TestoZa handles it.</strong> A PDF made from a Kruti Dev file carries the same English letters inside it. TestoZa spots pages like that and reads them as pictures instead, so the AI reads the Hindi printed on the page, not the letters hidden behind it. Photos and screenshots of the pages work the same way.</li>
</ul>
<p>Not sure what your file is? Paste a line from it here:</p>
`),
                    { type: 'widget', widget: 'hindi-unicode-check', fallbackHtml: UNICODE_FALLBACK },
                    html(`
<p>Files typed in Mangal, Nirmala UI, Kokila or a Google font such as Noto Sans Devanagari are already Unicode, so they paste and upload as Hindi. The test above takes a second and saves a whole paper from going out as “Hkkjr”.</p>
`),
                ],
            },
            {
                id: 'language',
                title: 'Hindi, English or both: choosing the paper’s language',
                tocLabel: 'Hindi or bilingual',
                kicker: 'Language',
                blocks: [
                    html(`
<p>AI import has a <strong>Language Output</strong> setting with three buttons, and the choice decides what kind of paper you get:</p>
<div class="ht-table-wrap"><table class="ht-table ht-table--lang">
<thead><tr><th scope="col">Language Output</th><th scope="col">What you get</th><th scope="col">Use it for</th></tr></thead>
<tbody>
<tr><th scope="row">Same as Material</th><td data-label="You get">The source’s own language</td><td data-label="Use it for">Importing a Hindi paper as it is</td></tr>
<tr><th scope="row">Hindi</th><td data-label="You get">Everything in Hindi, whatever the source is written in</td><td data-label="Use it for">A Hindi-medium test from an English chapter or paper</td></tr>
<tr><th scope="row">English</th><td data-label="You get">Everything in English</td><td data-label="Use it for">The reverse: an English test from a Hindi paper</td></tr>
<tr><th scope="row">English + Hindi</th><td data-label="You get">Every question and every option in both languages, one under the other</td><td data-label="Use it for">Batches with students from both mediums</td></tr>
</tbody>
</table></div>
<p>Try it with two sources: a page from an English textbook, and a photo of a printed Hindi paper.</p>
`),
                    { type: 'widget', widget: 'hindi-ai-language', fallbackHtml: AI_LANGUAGE_FALLBACK },
                    html(`
<h3>Translation is a first draft</h3>
<p>Choosing Hindi for an English source means the AI translates, and translation is where a careful teacher earns their keep. Science and general-knowledge Hindi mostly comes out right, but a translation can pick a word that is correct Hindi and still isn’t the word in your students’ book. NCERT’s Hindi-medium science books say फोकस दूरी for focal length and अपवर्तनांक for refractive index; a synonym costs a student a moment of doubt in the exam hall. Read translated questions against the Hindi textbook your students use and change any term that differs before the test goes out.</p>
<h3>How a bilingual paper looks</h3>
<p>With both languages selected, each question is written in one language with the other directly beneath it, and every option the same way, much like a NEET Hindi-medium booklet. TestoZa asks the AI to write the language you select first on top, so select Hindi first if most of the batch reads Hindi. Two habits keep a bilingual paper fair:</p>
<ul class="ht-list">
<li><strong>Say which version counts.</strong> NTA’s rule for NEET is that the English version is final if the two differ. Put your rule in the test’s description, so an argument about one word doesn’t become an argument about marks.</li>
<li><strong>Allow for the length.</strong> A bilingual question is twice as long on a phone, and the options may no longer fit on one screen. Check it on the smallest phone in the room and add a little time.</li>
</ul>
`),
                ],
            },
            {
                id: 'students',
                title: 'What students see on their phones',
                tocLabel: 'On the phone',
                kicker: 'Exam screen',
                blocks: [
                    html(`
<p>None of this matters unless the Hindi arrives intact on a student’s phone: usually an Android phone with a small screen and whatever fonts its maker chose. Three things decide whether it does.</p>
<ul class="ht-checks">
<li><strong>The typeface travels with the test.</strong> TestoZa’s screens use Mukta, a typeface designed by Ek Type for Devanagari and Latin together. Hindi and English in the same question match in size and weight, and look the same on every phone, instead of falling back to whatever Hindi font the phone has.</li>
<li><strong>Students can make the text bigger.</strong> Devanagari carries more detail above and below the line than English, and small Hindi is the first thing to become hard to read. On TestoZa’s exam screen, the faint − and + at the top right of the question change the text size from 12 to 32 pixels (it starts at 18), and the options follow.</li>
<li><strong>The controls are the familiar ones.</strong> The exam screen keeps the layout of a computer-based test: Back, Clear, Flag, Save &amp; Next and Submit Test, a timer, the marks for each question (+2 | −0.5) and a palette of question numbers. Those labels are in English, as on most computer-based exams.</li>
</ul>
<p>Here is the exam screen as a student sees it, with six questions from a Hindi-medium general science test. Answer a few, make the text bigger, and switch the paper to bilingual to see how much longer every question becomes:</p>
`),
                    { type: 'widget', widget: 'hindi-exam-screen', fallbackHtml: EXAM_FALLBACK },
                    html(`
<p>Before any Hindi test goes to a batch, open it once on the oldest phone you can borrow and read every question. Look for three things: a matra sitting on the wrong letter, which usually means the text came from a legacy font; a conjunct that has fallen apart into a letter and a halant (क्‌ष instead of क्ष); and options that wrap so much that all four no longer fit on the screen.</p>
`),
                ],
            },
            {
                id: 'formulas',
                title: 'Maths, science and numbers in a Hindi paper',
                tocLabel: 'Maths & numbers',
                kicker: 'Formulas',
                blocks: [
                    html(`
<p>A Hindi-medium physics or maths paper is mostly Hindi words around international symbols: 3 × 10⁸ मीटर/सेकंड, v = u + at, H₂SO₄. That mix is normal and it works, as long as you know what Hindi typing touches and what it leaves alone.</p>
<ul class="ht-list">
<li><strong>Numbers and symbols stay as typed.</strong> “20”, “3×10⁸” and “m/s” aren’t plain words, so they stay as they are in the middle of a Hindi sentence.</li>
<li><strong>English abbreviations need the English switch.</strong> “SI”, “km”, “pH” and “DNA” are all letters, so in Hindi mode they become सी, कम, पह and डीएनए. Switch the card to English for that word, type it, and switch back; the Hindi you have already typed stays as it is.</li>
<li><strong>Formulas go in with Maths &amp; symbols.</strong> Fractions, powers, roots and chemical equations are built on Sy Pad, TestoZa’s on-screen maths keyboard, and dropped into the Hindi text. Our <a href="/jee-mock-test-platform">guide to building JEE papers</a> shows Sy Pad in detail.</li>
<li><strong>Numerical answers use 0 to 9.</strong> Most Hindi-medium textbooks and papers print the international numerals (1, 2, 3), which is also the official form under Article 343 of the Constitution. Use Devanagari digits (१, २, ३) in the question text if your book does, but keep numerical answers in 0–9: the answer box on the exam screen takes its digits from its own on-screen keypad.</li>
</ul>
<p>If a question has a diagram, Fill from photo and AI import both keep it with the question. Hindi labels inside the diagram stay as they are in the picture, so make sure they are sharp enough to read on a phone.</p>
`),
                ],
            },
            {
                id: 'steps',
                title: 'Make your first Hindi test, step by step',
                tocLabel: 'Step by step',
                kicker: 'Step by step',
                blocks: [
                    html(`
<ol class="ht-steps">
<li><strong>Create a test and name it.</strong> Open Create a test. The name and the short description underneath each have their own English | हिंदी switch.</li>
<li><strong>Bring in what you have.</strong> A whole paper: Import from PDF or photos, with the language on Same as Material, Hindi, or English and Hindi. A few questions: Fill from photo on each card. Nothing yet: type.</li>
<li><strong>Switch the first card to हिंदी</strong> and type the first question. Every new card starts in Hindi after that.</li>
<li><strong>Set the marks once.</strong> Fill Marks and Wrong on the first card, for example +2 and −0.5. Each new question copies the one before it.</li>
<li><strong>Read it on a phone.</strong> Open the test on a phone and read every question once: matras, conjuncts, options, any formula.</li>
<li><strong>Share it.</strong> Send the link to the class WhatsApp group, or, for an exam at a fixed time, create a live exam and give students a six-digit code to type at testoza.com/join. Our guide to <a href="/how-to-conduct-online-exam">conducting an online exam</a> covers that part in detail.</li>
<li><strong>Read the results.</strong> Marks arrive as students submit, with each question’s accuracy, so a Hindi question that most of the batch misread stands out and can be fixed before the next test.</li>
</ol>
`),
                ],
            },
            {
                id: 'coaching',
                title: 'Hindi tests for competitive-exam coaching',
                tocLabel: 'Exam coaching',
                kicker: 'Coaching',
                blocks: [
                    html(`
<p>For coaching institutes across the Hindi belt, Hindi tests aren’t a feature. They are most of the work: SSC, railway, police and teacher-eligibility aspirants practise in Hindi, and the exams they sit are bilingual. A mock that doesn’t match the exam’s language and marking teaches the wrong habits.</p>
<div class="ht-table-wrap"><table class="ht-table ht-table--exams">
<thead><tr><th scope="col">Exam</th><th scope="col">Language of the paper</th><th scope="col">Pattern</th></tr></thead>
<tbody>
${EXAM_ROWS}
</tbody>
</table></div>
<p>Three things follow for the mocks you run:</p>
<ul class="ht-list">
<li><strong>Match the marking.</strong> Put the exam’s marks on every question: +2 and −0.5 for an SSC CGL mock, +1 and −0.33 for the railways, nothing off for CTET. Negative marking changes how students answer, so they need to practise with it.</li>
<li><strong>Offer both languages where the exam does.</strong> A bilingual mock lets a student check a Hindi term against the English, the way a NEET Hindi-medium booklet does.</li>
<li><strong>Time it like the exam, then a little kinder.</strong> SSC CGL Tier 1 allows 36 seconds a question. Reading Hindi on a phone is slower than on an exam centre’s monitor, so allow a little more in early mocks and bring it down.</li>
</ul>
<p>The same paper can be given to many batches, each as its own sitting with its own code and rank list, and the results show where each student lost marks. Our guides to <a href="/neet-online-test-software">NEET online test software</a> and <a href="/cbt-exam-software">CBT exam software</a> go deeper into running full mocks.</p>
`),
                ],
            },
            {
                id: 'google-forms',
                title: 'Can you make a Hindi test in Google Forms?',
                tocLabel: 'Google Forms',
                kicker: 'Other tools',
                blocks: [
                    html(`
<p>Yes, for a short quiz. Google Forms stores Unicode, so Hindi typed on a phone keyboard or pasted from a Unicode file shows correctly, and its quiz mode marks answers for you. For a ten-question practice quiz in Hindi it’s fine.</p>
<p>The limits are those of any Forms quiz, plus two that hurt more in Hindi:</p>
<ul class="ht-list">
<li><strong>Typing is up to you.</strong> Forms doesn’t turn English letters into Hindi as you type, so on a computer you need a Hindi keyboard installed, or you type elsewhere and paste.</li>
<li><strong>No reading a paper.</strong> Each question is typed or pasted into its own box; Forms can’t read a PDF or a photo of a Hindi paper.</li>
<li><strong>No timer and no negative marking</strong> without add-ons, which rules out most competitive-exam mocks.</li>
<li><strong>Bilingual by hand.</strong> You can type both languages into every question and option yourself; nothing does it for you.</li>
</ul>
<p>Our comparison of <a href="/compare/google-forms-alternative">TestoZa and Google Forms</a> covers the rest.</p>
`),
                ],
            },
            {
                id: 'mistakes',
                title: 'Eight mistakes that break Hindi tests',
                tocLabel: 'Mistakes',
                kicker: 'Avoid these',
                blocks: [
                    html(`
<ul class="ht-limits">
<li><strong>Pasting from a Kruti Dev file.</strong> It looks like Hindi on your computer and arrives as “Hkkjr” on students’ phones. Convert it before pasting, or upload the PDF or photos instead.</li>
<li><strong>Trusting every first suggestion.</strong> “kam” gives काम and “grah” gives गृह. Glance at each word as it changes, or use the spellings above.</li>
<li><strong>Typing abbreviations in Hindi mode.</strong> SI becomes सी, km becomes कम. Switch to English for them.</li>
<li><strong>Screenshots instead of text.</strong> A question pasted as a picture can’t be resized or searched, and it blurs on a small phone. Type it or import it.</li>
<li><strong>Grammar questions at a size nobody can read.</strong> When the question is the difference between कि and की, the matra is the answer. Check it at the size students will see.</li>
<li><strong>Translating without the textbook.</strong> A correct Hindi word that isn’t the book’s word costs marks in the hall. Check translated terms against the Hindi-medium book.</li>
<li><strong>A bilingual paper with no rule.</strong> Decide which language counts if the two versions differ, and say so before the test.</li>
<li><strong>Never opening it on a phone.</strong> Hindi that looks perfect on a laptop can wrap badly on a 5.5-inch screen. Read the whole paper on a phone before you share it.</li>
</ul>
`),
                ],
            },
            {
                id: 'limits',
                title: 'What TestoZa won’t do (yet)',
                tocLabel: 'Honest limits',
                kicker: 'Worth knowing',
                blocks: [
                    html(`
<ul class="ht-limits">
<li><strong>No language switch on the exam screen.</strong> A bilingual paper shows both languages together, one under the other. Students can’t flip a question between Hindi and English as some computer-based exams allow.</li>
<li><strong>The app itself is in English.</strong> Buttons, menus, results and report cards are in English; your questions are in Hindi.</li>
<li><strong>Hindi and English only.</strong> The AI writes papers in English, Hindi or both. Other Indian languages aren’t offered as an output language yet.</li>
<li><strong>No conversion of pasted Kruti Dev text.</strong> Text copied from a legacy-font file stays as it was pasted, so convert it first. Uploaded PDFs and photos are read from the page instead.</li>
<li><strong>Hindi typing needs the internet.</strong> Without a connection, words stay in English letters until it’s back.</li>
<li><strong>Option letters are A to D.</strong> A paper printed with (क) to (घ) shows A to D on the exam screen.</li>
<li><strong>Objective questions only.</strong> Single correct, multiple correct, numerical answers and passages. No essays or written answers, in Hindi or any language.</li>
</ul>
`),
                ],
            },
            {
                id: 'hindi',
                title: 'हिंदी में: ऑनलाइन टेस्ट कैसे बनाएं',
                tocLabel: 'हिंदी में',
                kicker: 'हिंदी',
                blocks: [
                    html(`
<div lang="hi" class="ht-hindi">
<p>अगर आप हिंदी माध्यम के शिक्षक हैं या प्रतियोगी परीक्षाओं की कोचिंग चलाते हैं, तो TestoZa पर हिंदी में ऑनलाइन टेस्ट बनाने के लिए हिंदी कीबोर्ड की ज़रूरत नहीं है।</p>
<ul class="ht-list">
<li><strong>अंग्रेज़ी अक्षरों में टाइप करें।</strong> प्रश्न कार्ड पर English | हिंदी स्विच को हिंदी पर करें और शब्द को अंग्रेज़ी अक्षरों में लिखें। स्पेस दबाते ही “prashn” प्रश्न बन जाता है। अगर पहला शब्द सही न हो, तो ऊपर दिखने वाले सुझावों में से सही शब्द चुन लें।</li>
<li><strong>पुराना प्रश्नपत्र दोबारा टाइप न करें।</strong> किसी एक प्रश्न के लिए “Fill from photo” दबाकर उसकी फ़ोटो लें। पूरे प्रश्नपत्र के लिए “Import from PDF or photos” से PDF या फ़ोटो अपलोड करें। AI प्रश्नों को हिंदी में ही रखता है, उनका अनुवाद करता है, या हर प्रश्न को हिंदी और अंग्रेज़ी दोनों में लिख देता है।</li>
<li><strong>कृतिदेव (Kruti Dev) से सावधान रहें।</strong> कृतिदेव, चाणक्य या DevLys फ़ॉन्ट में टाइप किया गया पाठ असल में अंग्रेज़ी अक्षरों में सेव होता है, इसलिए वेबसाइट पर वह “Hkkjr” जैसा दिखता है। ऐसा पाठ कॉपी-पेस्ट करने से पहले यूनिकोड में बदलें। PDF या फ़ोटो अपलोड करने पर TestoZa पन्ने पर छपी हिंदी को ही पढ़ता है।</li>
<li><strong>अंक और ऋणात्मक अंकन।</strong> हर प्रश्न पर सही उत्तर के अंक और गलत उत्तर पर कटने वाले अंक डालें, जैसे +2 और −0.5। अगला प्रश्न पिछले प्रश्न के अंक अपने आप ले लेता है।</li>
<li><strong>भेजने से पहले मोबाइल पर पढ़ें।</strong> छात्रों को प्रश्न साफ़ हिंदी (मुक्ता फ़ॉन्ट) में दिखते हैं और वे अक्षरों का आकार बड़ा कर सकते हैं। फिर भी पूरा पेपर एक बार किसी पुराने फ़ोन पर ज़रूर पढ़ें।</li>
</ul>
<p>टेस्ट बनाना और साझा करना मुफ़्त है। छात्र किसी भी फ़ोन के ब्राउज़र में लिंक से टेस्ट दे सकते हैं, और छह अंकों के कोड से जुड़ने के लिए उन्हें कोई अकाउंट नहीं बनाना पड़ता।</p>
</div>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'How do I make an online test in Hindi?',
                a: 'In TestoZa, open Create a test, switch the question card to हिंदी and type in English letters: each word becomes Hindi when you press space. Or import an existing Hindi paper as a PDF or photos with the AI, which keeps it in Hindi. Set the marks, read the test once on a phone, then share the link or give students a six-digit join code. Making and sharing tests is free.',
            },
            {
                q: 'Do I need a Hindi keyboard to type Hindi questions?',
                a: 'No. In TestoZa you type the word in English letters and it turns into Hindi when you press space, for example “uttar” becomes उत्तर, with up to five suggestions to pick from. On a phone, Gboard’s Hindi keyboard also works, and Windows 10 and 11 include a Hindi Phonetic keyboard.',
            },
            {
                q: 'Can I make a bilingual Hindi and English test?',
                a: 'Yes. In AI import, select both English and Hindi as the Language Output. Every question and every option is then written in both languages, one under the other, with the language you select first on top. You can also type both languages into a question yourself. Students see both together; there is no switch on the exam screen.',
            },
            {
                q: 'Can I turn an English question paper into a Hindi test?',
                a: 'Yes. Upload the English paper or chapter to AI import and choose Hindi as the Language Output; the questions and options come back in Hindi. Treat the translation as a first draft and check technical terms against the Hindi-medium textbook your students use.',
            },
            {
                q: 'Why does my Hindi text show as “Hkkjr dh jkt/kkuh”?',
                a: 'Because it was typed in a legacy font such as Kruti Dev, Chanakya or DevLys. Those fonts store English letters and only draw them as Hindi where the font is installed, so the text turns back into letters on any website or phone. Convert it with a Kruti Dev to Unicode converter, or upload a photo of the paper instead.',
            },
            {
                q: 'Can TestoZa import a Kruti Dev PDF?',
                a: 'Yes. TestoZa spots PDF pages typed in Kruti Dev, DevLys or a similar font and reads them as pictures, so the AI reads the Hindi printed on the page rather than the English letters hidden in the file. Photos and screenshots of the pages work too. Text you copy and paste from such a file still needs converting to Unicode first.',
            },
            {
                q: 'Will Hindi show correctly on students’ phones?',
                a: 'Yes, if it is Unicode. TestoZa shows tests in Mukta, a typeface designed for Devanagari and Latin, so matras and conjuncts look the same on every phone, and students can enlarge the text with the − and + at the top right of the question. Read your paper once on an old phone before sharing it.',
            },
            {
                q: 'Can I write formulas and numbers in a Hindi question?',
                a: 'Yes. Numbers and symbols stay as typed in Hindi mode, and fractions, powers and chemical equations go in with Maths & symbols (Sy Pad). English abbreviations such as SI or km are all letters, so switch the card to English for those words. Numerical answers use the digits 0 to 9 from the exam screen’s keypad.',
            },
            {
                q: 'Is the TestoZa interface available in Hindi?',
                a: 'Not yet. Buttons, menus and results are in English, and only the questions are in Hindi. The exam screen uses the familiar computer-based test layout (Save & Next, Clear, Submit Test), which most Hindi-medium students also meet in national exams.',
            },
            {
                q: 'Is the Hindi online test maker free?',
                a: 'Yes. Building tests, Hindi typing, importing papers with AI (with hourly limits), sharing links, live exams with join codes and results are free. Paid plans (₹49 a week, ₹149 a month or ₹799 a year) add exam-security rules such as full screen and app-switch detection, a schedule on exam links, institute branding and Excel export.',
            },
            {
                q: 'Can I make a Hindi quiz in Google Forms?',
                a: 'Yes, for a short practice quiz: Forms stores Unicode and marks answers automatically. It doesn’t turn English letters into Hindi as you type, can’t read a PDF or a photo of a paper, and has no timer or negative marking without add-ons, so competitive-exam mocks are better made on an exam platform.',
            },
            {
                q: 'Can students take a Hindi test without an account?',
                a: 'Yes, with a live exam. The teacher creates a sitting and gets a six-digit code; students open testoza.com/join in any phone browser, type the code and check in with their name or roll number. The test appears in Hindi exactly as it was made.',
            },
        ],

        closingTitle: 'Make your first Hindi test this week',
        closing: [
            html(`
<p>Start from whatever you have:</p>
<div class="ht-paths">
<a class="ht-path" href="/create-test" data-icon="pencil"><span class="ht-path-who">Starting from scratch?</span><span class="ht-path-what">Switch a card to हिंदी and type</span></a>
<a class="ht-path" href="/generate-with-ai" data-icon="doc"><span class="ht-path-who">Have a Hindi paper?</span><span class="ht-path-what">Import it from a PDF or photos</span></a>
<a class="ht-path" href="/how-to-conduct-online-exam" data-icon="key"><span class="ht-path-who">Testing at a fixed time?</span><span class="ht-path-what">Give students a join code</span></a>
</div>
<p>Related reading: <a href="/ai-test-generator">the AI test generator</a>, <a href="/neet-online-test-software">NEET online test software</a>, <a href="/cbt-exam-software">CBT exam software</a>, <a href="/how-to-conduct-online-exam">how to conduct an online exam</a> and <a href="/pricing">pricing</a>. Need to change the Hindi inside a PDF itself? Try the free <a href="https://pdf.testoza.com/edit-hindi-pdf">Hindi PDF editor</a>.</p>
`),
        ],

        sources: [
            {
                label: 'Hindi in India',
                links: [{ label: 'Census of India 2011, Language (Paper 1 of 2018)', href: 'https://censusindia.gov.in/nada/index.php/catalog/42458' }],
            },
            {
                label: 'Exam languages and patterns',
                links: [
                    { label: 'NEET-UG (NTA)', href: 'https://neet.nta.nic.in/' },
                    { label: 'Staff Selection Commission', href: 'https://ssc.gov.in/' },
                    { label: 'Railway Recruitment Boards', href: 'https://www.rrbapply.gov.in/' },
                    { label: 'CTET (CBSE)', href: 'https://ctet.nic.in/' },
                ],
            },
            {
                label: 'Typing and fonts',
                links: [
                    { label: 'Hindi Phonetic IME (Microsoft)', href: 'https://learn.microsoft.com/en-us/globalization/input/hindi-ime' },
                    { label: 'Mukta (Google Fonts)', href: 'https://fonts.google.com/specimen/Mukta' },
                    { label: 'Ek Type', href: 'https://ektype.in/' },
                ],
            },
            {
                label: 'Numerals and textbooks',
                links: [
                    { label: 'The Constitution of India, Article 343', href: 'https://legislative.gov.in/constitution-of-india/' },
                    { label: 'NCERT textbooks', href: 'https://ncert.nic.in/textbook.php' },
                ],
            },
            {
                label: 'Google Forms',
                links: [{ label: 'Make a quiz with Google Forms (Google Help)', href: 'https://support.google.com/docs/answer/7032287' }],
            },
            {
                label: 'TestoZa',
                links: [
                    { label: 'AI test generator', href: 'https://testoza.com/ai-test-generator' },
                    { label: 'Pricing', href: 'https://testoza.com/pricing' },
                ],
            },
        ],
    },
};
