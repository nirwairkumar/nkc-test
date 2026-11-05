/**
 * Three comparison guides of 5 November 2026 that run on the "how to" shell
 * (pages/guides/howto/HowToPage.tsx) with its widgets as they are, and no new components
 * or styles:
 *
 *   /blooket-gimkit-alternative     /best-proctoring-software     /best-ai-quiz-generator
 *
 * Kept out of howtoData.ts and testMakerData.ts so those pages stay as they were. Each page
 * uses hw-compare and hw-scenarios; its `steps` are shown as a plain numbered list
 * (stepsFallback), which reads better on a phone than the checklist widget.
 *
 * Plain, dependency-free TypeScript: the Cloudflare worker imports it too. Icon names must
 * exist in pages/guides/howto/HwIcon.tsx (HW_ICONS), or a plain circle is drawn.
 *
 * Rival facts are the ones written up in the header of each guide file, checked on
 * 5 November 2026. TestoZa facts were checked against the code the same day:
 *   - exam rules (pages/TestPage.tsx): full screen asked for and its exit counted (skipped
 *     where the browser can't do it, such as iPhone Safari), tab and app switches counted,
 *     copy, cut, paste and right-click blocked, a limit that submits the paper, question
 *     shuffle; the answer key stays on the server until the candidate has submitted
 *     (routers/tests/read.py); one device per seat, roll + PIN check-in and the server's
 *     clock on live exams (routers/join.py, services/exam_sessions.py); the exam room lists
 *     no signal, warnings and changed device (components/exams/MonitorPanel.tsx). Never a
 *     camera, microphone or screen recording. The stricter rules are on paid plans.
 *   - AI import (pages/AITestImporter.tsx, backend ai_preview_importer): PDFs and pictures
 *     (.pdf .png .jpg .jpeg .webp), several files at once; Word and PowerPoint are refused
 *     with "save as PDF"; no YouTube, web page or typed-topic input. Extract reads the
 *     questions that are there and never guesses an answer; Generate writes new questions
 *     from the material at Easy / Moderate / Tough (default Tough); output in the
 *     material's language, English, Hindi or two languages side by side (文A lists every
 *     language); equations as typeset maths, diagrams cropped; a review screen with a
 *     "Needs answer" filter before saving; 30 runs per user an hour; included on the free
 *     plan. The pricing page's "PDF & Video" / "from PDFs or YouTube" wording is wrong and
 *     was flagged to the owner, not repeated here.
 */
import type { HowtoPage } from './howtoData';

// ── /blooket-gimkit-alternative ─────────────────────────────────────────────

const BLOOKET_GIMKIT: HowtoPage = {
    key: 'blooketGimkit',
    hero: {
        title: 'A game picks a winner. A test gives a mark.',
        tag: 'Games vs tests',
        groups: [
            {
                label: 'What decides a Blooket or Gimkit game',
                icon: 'mouse-pointer-click',
                rows: [
                    { icon: 'sparkles', label: 'Blooket: a random chest after each right answer' },
                    { icon: 'bar-chart-3', label: 'Gimkit: in-game cash, spent on upgrades' },
                    { icon: 'users', label: 'Stealing, swapping and power-ups between players' },
                ],
            },
            {
                label: 'What a test that counts needs',
                icon: 'shield-check',
                us: true,
                rows: [
                    { icon: 'copy-check', label: 'The same answers always earn the same marks' },
                    { icon: 'minus-circle', label: 'Negative marking like the real exam' },
                    { icon: 'timer', label: 'A timer, a question palette and a rank list' },
                ],
            },
        ],
        foot: 'Keep the game for Friday. Use a marked test when the score has to mean something.',
    },
    stats: [
        { dt: 'Blooket free plan, players per game', dd: '60' },
        { dt: 'Gimkit Pro, a year', dd: '$59.88' },
        { dt: 'Luck in a TestoZa score', dd: '0' },
        { dt: 'To build and run a test on TestoZa', dd: '₹0' },
    ],
    checked: 'Blooket and Gimkit facts from their own help centres, checked 5 November 2026',
    compare: {
        title: 'A classroom game and a marked test',
        themLabel: 'Blooket and Gimkit',
        usLabel: 'A marked test on TestoZa',
        themes: [
            {
                id: 'winner',
                label: 'The winner',
                question: 'What decides who comes first?',
                them: [
                    'Blooket’s Gold Quest: each right answer opens one of three chests. A chest can add gold, multiply it, take a share from a rival, or cost you some.',
                    'Gimkit’s Classic: the most in-game money at the end, after spending on upgrades such as a multiplier.',
                ],
                us: ['Marks. Two students with the same answers get the same score, every time.'],
                takeaway: 'Luck and strategy keep a game exciting, and that is the point of a game. It also means the leaderboard can’t tell you who knows the chapter.',
            },
            {
                id: 'wrong',
                label: 'A wrong answer',
                question: 'What does a wrong answer cost?',
                them: [
                    'Usually just a missed turn at the chest. In Gimkit, a wrong answer can cost in-game cash and breaks a streak; an upgrade called Insurance softens the loss.',
                ],
                us: ['Whatever the real exam takes: −1 for JEE Main and NEET, −0.5 for SSC, −0.25 for bank exams, or nothing for a school test.'],
                takeaway: 'A cash penalty you can insure against teaches a different habit from a mark that is simply gone.',
            },
            {
                id: 'screen',
                label: 'The screen',
                question: 'What do students look at while answering?',
                them: ['One question at a time inside a game: chests, towers, a shop. Usually played live, with a timer for the whole game.'],
                us: ['The exam screen: a countdown, a question palette, Mark for review, Back and Save & Next. The same layout as NTA computer-based tests.'],
                takeaway: 'If the real exam is a computer-based test, students should practise on a screen like it before the day.',
            },
            {
                id: 'results',
                label: 'Afterwards',
                question: 'What do you get back?',
                them: ['A podium and a report of who answered what. Gimkit and Blooket both show per-question results to the teacher.'],
                us: ['A rank list by marks, results per section and topic, time spent per question, report cards and a WhatsApp note for each parent.'],
                takeaway: 'A game report tells you how the class did in the game. A test report tells you who needs help with what.',
            },
        ],
        caption:
            'The left column describes Blooket’s Gold Quest and Gimkit’s Classic mode from their own help pages, checked in November 2026. Both have many other modes; the point holds for most of them.',
    },
    scenarios: {
        title: 'Game or test? Pick the moment',
        sub: 'Choose the situation closest to yours.',
        columns: ['Best tool', 'Why', 'Tip'],
        items: [
            {
                id: 'friday',
                label: 'Revision game',
                icon: 'sparkles',
                title: 'A Friday revision game for a class that is tired of worksheets',
                lines: [
                    'Blooket or Gimkit. Either is excellent here.',
                    'Energy, every student answering, and a winner the class didn’t expect.',
                    'Use questions from this week’s test, so the game revises what students got wrong.',
                ],
            },
            {
                id: 'weekly',
                label: 'Weekly test',
                icon: 'list-ordered',
                title: 'A weekly chapter test whose marks go in your register',
                lines: [
                    'A marked test: TestoZa, or Google Forms for a short one.',
                    'The mark has to depend only on the answers, not on chests, upgrades or speed.',
                    'Photograph the chapter’s exercise page and let the AI turn it into the test.',
                ],
            },
            {
                id: 'mock',
                label: 'Exam mock',
                icon: 'timer',
                title: 'A mock for JEE, NEET, SSC, bank exams or CUET',
                lines: [
                    'TestoZa, with the exam’s own marking and time.',
                    'Students need the real penalty, the real clock and an exam-style screen, all in one sitting.',
                    'Set +4/−1 (or the exam’s scheme) and switch on section timing if the exam has it.',
                ],
            },
            {
                id: 'homework',
                label: 'Homework',
                icon: 'clock',
                title: 'Practice students do at home, at their own pace',
                lines: [
                    'Gimkit assignments (a Pro feature) or Blooket homework for drills; a TestoZa test link for anything you will mark.',
                    'Games keep a drill going; a test link gives you one score per student to compare.',
                    'Set a start and end time on the test link so everyone sits it in the same window.',
                ],
            },
            {
                id: 'big',
                label: 'Big group',
                icon: 'users',
                title: 'A live quiz for more than 60 students at once',
                lines: [
                    'Blooket Plus (up to 300 players in most modes), Gimkit, Kahoot or Wayground for a game; TestoZa for a test.',
                    'Blooket’s free plan caps a game at 60 players.',
                    'For a test, give everyone one six-digit code to type at testoza.com/join.',
                ],
            },
            {
                id: 'exit',
                label: 'Exit ticket',
                icon: 'message-circle',
                title: 'Three questions at the end of a lesson',
                lines: [
                    'Socrative, Google Forms or a short TestoZa test.',
                    'You need to see who understood, not who won.',
                    'Keep it to three questions and look at the answers before the next class.',
                ],
            },
        ],
        caption: 'We make TestoZa. The first card says plainly that a game is the right tool for a game.',
    },
    steps: {
        title: 'Move one game set into a marked test',
        sub: 'Keep the game. Add a test that counts.',
        items: [
            { id: 'pick', title: 'Pick the set students played this week', detail: 'Or the textbook page it came from. Twenty to thirty questions is enough.', minutes: 5 },
            { id: 'import', title: 'Get the questions in', detail: 'Upload the PDF or photograph the page; the AI reads questions, options and answers into the builder. Or paste them in.', minutes: 10 },
            { id: 'mark', title: 'Set the marking', detail: '+1 with no negative for a school test, or the exam’s scheme (+4/−1) for an entrance mock.', minutes: 3 },
            { id: 'time', title: 'Set the time', detail: 'About a minute per question for a chapter test, the exam’s own time for a mock.', minutes: 2 },
            { id: 'share', title: 'Share one code or link', detail: 'Students type the six-digit code at testoza.com/join, or open the link. No app and no account.', minutes: 2 },
            { id: 'replay', title: 'Play the game afterwards', detail: 'Use the questions most students got wrong as next Friday’s Blooket or Gimkit round.', minutes: 5 },
        ],
        caption: 'Minutes are your working time for a test of about 25 questions.',
        doneText: 'One game, one test, both doing their job.',
    },
};

// ── /best-proctoring-software ───────────────────────────────────────────────

const PROCTORING: HowtoPage = {
    key: 'proctoring',
    hero: {
        title: 'Match the proctoring to the stakes',
        tag: 'Proctoring 2026',
        groups: [
            {
                label: 'Hiring, licences and university finals',
                icon: 'id-card',
                rows: [
                    { icon: 'user-check', label: 'Mercer Mettl, Talview: AI flags plus ID checks' },
                    { icon: 'users', label: 'Honorlock, ProctorU: live human proctors' },
                    { icon: 'shield-check', label: 'Proctorio: a browser extension, set per exam' },
                ],
            },
            {
                label: 'Exams in a lab or on school laptops',
                icon: 'lock',
                rows: [
                    { icon: 'lock', label: 'Safe Exam Browser: free, open source' },
                    { icon: 'layout-grid', label: 'Respondus LockDown Browser with your LMS' },
                ],
            },
            {
                label: 'Weekly tests on students’ phones',
                icon: 'smartphone',
                us: true,
                rows: [
                    { icon: 'maximize', label: 'TestoZa: full screen, counted tab switches' },
                    { icon: 'key-round', label: 'One device per seat, roll number and PIN' },
                ],
            },
        ],
        foot: 'The higher the stakes, the heavier the proctoring. We make TestoZa; every other name is described from its own pages.',
    },
    stats: [
        { dt: 'Tools compared', dd: '11' },
        { dt: 'AutoProctor, one proctored attempt', dd: '₹9' },
        { dt: 'Indian phones on Android', dd: '93.9', small: '%' },
        { dt: 'Cameras TestoZa switches on', dd: '0' },
    ],
    checked: 'Facts from each product’s own pages, checked 5 November 2026',
    compare: {
        title: 'Camera proctoring and browser rules',
        themLabel: 'Camera proctoring',
        usLabel: 'Browser rules (TestoZa)',
        themes: [
            {
                id: 'catches',
                label: 'What it catches',
                question: 'What kind of cheating does it stop?',
                them: [
                    'Someone else sitting the exam (face match and ID checks), a second person in the room, a phone on the desk, help through earphones.',
                    'Most also lock the browser, so other tabs and apps are blocked.',
                ],
                us: [
                    'The common, easy kind: leaving the exam to search, copying the questions out, a second device in the same seat, sharing the answer key.',
                    'It cannot see the room. Someone helping from beside the desk is not caught.',
                ],
                takeaway: 'Proctoring that can’t see the room stops lazy cheating. Proctoring that can stops more, at a cost in money, devices and privacy.',
            },
            {
                id: 'needs',
                label: 'What it needs',
                question: 'What does a candidate need before question 1?',
                them: [
                    'Usually a laptop or desktop with a webcam and microphone, a supported browser, often an extension or a lockdown browser to install, and steady internet.',
                    'Mettl’s help centre says its proctored tests don’t run on phones or tablets. Respondus has no Android version. Proctorio supports phones only through a paid mobile add-on.',
                ],
                us: ['The phone they already have, in its ordinary browser. They type a six-digit code at testoza.com/join.'],
                takeaway: 'In India most students own a phone, not a laptop. A laptop-and-webcam rule decides who can sit the exam.',
            },
            {
                id: 'flags',
                label: 'False flags',
                question: 'What happens when it gets it wrong?',
                them: [
                    'AI flags a look away, a noise, poor light or a family member walking past. Someone has to review each flag, or the flags decide.',
                    'Honorlock sends a live proctor in when its AI flags something, and Talview says the final call stays with you.',
                ],
                us: ['Rules count events (leaving full screen, switching away). You choose whether the limit warns or submits the paper, and you see the count per candidate.'],
                takeaway: 'Budget time to review flags. A hundred candidates can produce hundreds of flags, and most are innocent.',
            },
            {
                id: 'privacy',
                label: 'Privacy',
                question: 'What does it record?',
                them: ['Video, audio and often the screen, plus a photo of an ID. That is personal data of the most sensitive kind, and many candidates are under 18.'],
                us: ['No camera, microphone or screen recording. Only the answers, the time and the rule events.'],
                takeaway: 'Under India’s DPDP Act, data about children needs extra care. The less you record, the less you have to protect.',
            },
            {
                id: 'cost',
                label: 'Cost',
                question: 'What does it cost?',
                them: [
                    'Mostly per attempt or per candidate, or an institution contract. AutoProctor publishes ₹9 per proctored attempt, more with add-ons; university price lists show ProctorU’s live proctoring at about $17 to $33 per exam.',
                ],
                us: ['A pass for a period: ₹49 for 7 days, ₹149 for 30 days, ₹799 a year. Basic rules are on the free plan.'],
                takeaway: 'Per-attempt pricing is fair for a few big exams a year and expensive for a weekly test.',
            },
        ],
        caption:
            'The left column describes Mercer Mettl, Proctorio, Honorlock, Respondus, ProctorU, Talview and AutoProctor from their own pages and university help pages, checked in November 2026.',
    },
    scenarios: {
        title: 'Which proctoring fits your exam?',
        sub: 'Pick the situation closest to yours.',
        columns: ['What you need', 'Shortlist', 'Watch out'],
        items: [
            {
                id: 'hiring',
                label: 'Hiring',
                icon: 'id-card',
                title: 'A company screening job applicants online',
                lines: [
                    'Proof of identity, a webcam, AI flags, and often coding or aptitude tests in the same tool.',
                    'Mercer Mettl or Talview. AutoProctor if your test is already in Google Forms or Microsoft Forms.',
                    'Applicants need a laptop with a webcam. Say so in the invitation, not on the day.',
                ],
            },
            {
                id: 'university',
                label: 'University',
                icon: 'layers',
                title: 'A university running semester exams that students take at home',
                lines: [
                    'Something that plugs into your LMS, records the sitting and gives faculty a review screen.',
                    'Proctorio, Honorlock or Respondus Monitor with Moodle or Canvas; Mettl or Eklavvya as standalone suites.',
                    'Plan for students without a laptop: a lab slot, or a loan device.',
                ],
            },
            {
                id: 'licence',
                label: 'Certification',
                icon: 'user-check',
                title: 'A certification or licensing exam with high stakes',
                lines: [
                    'A live human proctor, an ID check, and a record that stands up if a result is challenged.',
                    'ProctorU (Meazure Learning), Honorlock or Talview with live proctoring.',
                    'Live proctors need booking. Check slots for your candidates’ time zone.',
                ],
            },
            {
                id: 'lab',
                label: 'Lab exam',
                icon: 'lock',
                title: 'An exam in a computer lab or on school laptops',
                lines: [
                    'A locked browser on machines you control. No camera needed: an invigilator is in the room.',
                    'Safe Exam Browser (free) with Moodle, or Respondus LockDown Browser with your LMS.',
                    'Install and test on every machine the day before.',
                ],
            },
            {
                id: 'coaching',
                label: 'Coaching',
                icon: 'smartphone',
                title: 'A coaching institute’s weekly tests and mocks at home',
                lines: [
                    'Rules that stop easy cheating on any phone, without asking families for a webcam and a private room.',
                    'TestoZa: full screen, counted tab switches, copy and paste off, one device per seat, a live exam room.',
                    'It doesn’t stop a friend sitting beside the student. For a scholarship test that decides money, hold it in your centre.',
                ],
            },
            {
                id: 'school',
                label: 'School',
                icon: 'layout-grid',
                title: 'A school’s unit tests on students’ own devices',
                lines: [
                    'Light rules, no recording of children, marks the same evening.',
                    'TestoZa or Google Forms; Forms’ locked mode works only on school-managed Chromebooks.',
                    'For board-style written papers, keep them on paper in the classroom.',
                ],
            },
        ],
        caption: 'We make TestoZa. The Hiring, University and Certification cards name other tools because TestoZa has no camera proctoring or ID checks.',
    },
    steps: {
        title: 'Pilot a proctoring tool before exam day',
        sub: 'Do this with ten real candidates, not a vendor demo.',
        items: [
            { id: 'devices', title: 'List the devices candidates really have', detail: 'Ask the batch: phone only, shared laptop, own laptop with webcam. This decides half the shortlist.', minutes: 10 },
            { id: 'check', title: 'Run the vendor’s system check on those devices', detail: 'Including the cheapest Android phone and the oldest laptop. Note every install, permission and failure.', minutes: 20 },
            { id: 'mock', title: 'Sit a 20-minute mock with ten people', detail: 'At home, on mobile data, at the time of day the real exam will run.', minutes: 30 },
            { id: 'cheat', title: 'Cheat on purpose', detail: 'Switch tabs, use a second phone, ask a friend in the room. See which of these are caught and which aren’t.', minutes: 15 },
            { id: 'review', title: 'Time the flag review', detail: 'Count the flags from ten people, how many were innocent, and how long it took to decide.', minutes: 20 },
            { id: 'price', title: 'Price the year with add-ons', detail: 'Attempts × exams × add-ons (ID check, recording, live proctor). Ask about retakes and failed starts.', minutes: 10 },
        ],
        caption: 'Minutes are for one pilot. A pilot of ten people tells you more than any feature list.',
        doneText: 'You know what you are buying.',
    },
};

// ── /best-ai-quiz-generator ─────────────────────────────────────────────────

const AI_QUIZ: HowtoPage = {
    key: 'aiQuiz',
    hero: {
        title: 'Write new questions, or read the ones you have',
        tag: 'AI quizzes',
        groups: [
            {
                label: 'Writes questions from a topic or text',
                icon: 'sparkles',
                rows: [
                    { icon: 'message-circle', label: 'ChatGPT, Gemini: any topic, any style' },
                    { icon: 'layout-template', label: 'MagicSchool, Questgen, PrepAI: teacher tools' },
                ],
            },
            {
                label: 'Builds the quiz inside a quiz app',
                icon: 'mouse-pointer-click',
                rows: [
                    { icon: 'file-text', label: 'Google Forms and Microsoft Forms: AI built in' },
                    { icon: 'users', label: 'Wayground, Kahoot: a game from your PDF' },
                ],
            },
            {
                label: 'Reads your paper into a timed test',
                icon: 'copy-check',
                us: true,
                rows: [
                    { icon: 'file-text', label: 'TestoZa: a PDF or photo, question by question' },
                    { icon: 'minus-circle', label: 'With the answer key, equations and +4/−1' },
                ],
            },
        ],
        foot: 'Whichever you use, check every answer. We make TestoZa; every other name is described from its own pages.',
    },
    stats: [
        { dt: 'Tools compared', dd: '12' },
        { dt: 'Characters Wayground reads from a file', dd: '16,000' },
        { dt: 'TestoZa AI runs an hour', dd: '30' },
        { dt: 'TestoZa AI on the free plan', dd: '₹0' },
    ],
    checked: 'Facts from each product’s own pages, checked 5 November 2026',
    compare: {
        title: 'A general chatbot and a test generator',
        themLabel: 'A general chatbot',
        usLabel: 'TestoZa’s AI import',
        themes: [
            {
                id: 'source',
                label: 'The source',
                question: 'Where do the questions come from?',
                them: ['From what you type or attach, plus whatever the model already “knows”. Ask for ten questions on photosynthesis and it writes ten, from memory.'],
                us: [
                    'From your material. Extract reads the questions already in a PDF or photo; Generate writes new ones from the pages you give it.',
                ],
                takeaway: 'Your own past papers are the best source you have. A tool that reads them saves more time than one that writes new ones.',
            },
            {
                id: 'key',
                label: 'Answer key',
                question: 'Where does the answer key come from?',
                them: ['The model decides the right option itself. It is usually right and sometimes confidently wrong, especially in maths and numericals.'],
                us: [
                    'Extract never guesses: it takes the key from the material, and questions without one are listed under “Needs answer” for you to fill in.',
                ],
                takeaway: 'A wrong key costs a student marks and costs you trust. Check every answer the AI decided by itself.',
            },
            {
                id: 'maths',
                label: 'Maths',
                question: 'What happens to equations and diagrams?',
                them: ['Equations come back as plain text or code you then have to fix. Diagrams are described in words, or skipped.'],
                us: ['Equations are typeset as maths and diagrams are cropped from the page and attached to their question.'],
                takeaway: 'For science and maths papers, test the tool on the hardest page you have, not a page of plain text.',
            },
            {
                id: 'after',
                label: 'Afterwards',
                question: 'What do you have when it finishes?',
                them: ['Text in a chat window. You copy it into a form or quiz app and set it up there.'],
                us: ['A test in the builder: marks and negative marks, a timer, a link or a six-digit code, then results and a rank list.'],
                takeaway: 'Count the minutes from your PDF to a link students can open. That is the number that matters.',
            },
            {
                id: 'language',
                label: 'Language',
                question: 'Can the questions be in Hindi or two languages?',
                them: ['Yes, if you ask; the quality varies, and you lay out the bilingual version yourself.'],
                us: ['Choose the material’s own language, English, Hindi, or two languages side by side for each question.'],
                takeaway: 'Bilingual papers are normal in India. Try your own Hindi page before you trust any tool with it.',
            },
        ],
        caption: 'The left column describes general chatbots such as ChatGPT, Gemini and Claude used on their own. They are very good at writing; the work is everything around the questions.',
    },
    scenarios: {
        title: 'Which AI quiz generator fits your job?',
        sub: 'Pick the situation closest to yours.',
        columns: ['Best tool', 'Why', 'Check'],
        items: [
            {
                id: 'paper',
                label: 'Old papers',
                icon: 'file-text',
                title: 'You have last year’s papers as PDFs or printed pages',
                lines: [
                    'TestoZa, in Extract mode.',
                    'It reads the questions that are already there, with the answer key, equations and diagrams, instead of writing new ones.',
                    'Open the “Needs answer” filter and fill in anything the key didn’t cover.',
                ],
            },
            {
                id: 'topic',
                label: 'Just a topic',
                icon: 'sparkles',
                title: 'You have a topic and no material',
                lines: [
                    'ChatGPT or Gemini, or a teacher tool such as MagicSchool or Questgen.',
                    'They write from what the model knows, in any style you ask for.',
                    'Solve every question yourself before students see it.',
                ],
            },
            {
                id: 'workspace',
                label: 'Google school',
                icon: 'layout-grid',
                title: 'Your school runs on Google Workspace or Microsoft 365',
                lines: [
                    'Gemini in Google Forms or Copilot in Microsoft Forms, if your plan includes them.',
                    'The quiz lands straight in a form your school already uses.',
                    'Check your plan: both need an eligible paid licence, and Forms quizzes have no negative marking.',
                ],
            },
            {
                id: 'game',
                label: 'Class game',
                icon: 'mouse-pointer-click',
                title: 'You want a live game in class from your notes',
                lines: [
                    'Wayground or Kahoot.',
                    'Both turn a document into a game the room plays together.',
                    'Wayground reads the first 16,000 characters of a file; Kahoot’s PDF tool depends on your plan.',
                ],
            },
            {
                id: 'exam',
                label: 'Exam mock',
                icon: 'timer',
                title: 'You need a JEE, NEET, SSC or bank-style mock',
                lines: [
                    'TestoZa.',
                    'The AI fills the builder, and the test then runs with +4/−1, sections, an NTA-style screen and a rank list.',
                    'Set the marking before you share; the AI doesn’t choose it for you.',
                ],
            },
            {
                id: 'video',
                label: 'A video',
                icon: 'layout-template',
                title: 'Your lesson is a YouTube video',
                lines: [
                    'Wayground, which takes a public YouTube link.',
                    'TestoZa doesn’t read videos; it reads PDFs and pictures.',
                    'Or take a screenshot of the video’s key slides and upload those.',
                ],
            },
        ],
        caption: 'We make TestoZa. The Topic, Google school, Class game and Video cards name other tools because they do those jobs better.',
    },
    steps: {
        title: 'Test any AI quiz generator in 30 minutes',
        sub: 'Use your own material, not the tool’s sample. Run the same check on every tool you try.',
        items: [
            { id: 'page', title: 'Pick one hard page', detail: 'A page with an equation, a diagram and, if you teach in Hindi, Hindi text. Plain text proves nothing.', minutes: 3 },
            { id: 'run', title: 'Ask for ten questions', detail: 'From that page only. Note how long it takes and what it asks of you first (sign-up, plan, file type).', minutes: 5 },
            { id: 'key', title: 'Check all ten answers yourself', detail: 'Count wrong keys, two options that are both right, and questions the page doesn’t actually answer.', minutes: 10 },
            { id: 'maths', title: 'Look at the maths and the diagram', detail: 'Are equations readable? Is the diagram there, with its question?', minutes: 3 },
            { id: 'share', title: 'Get it to a link students can open', detail: 'With a timer and your marking. Time this step too.', minutes: 5 },
            { id: 'price', title: 'Price a term', detail: 'Quizzes a week × weeks. Is the AI on the free plan, metered per run, or a paid add-on?', minutes: 4 },
        ],
        caption: 'Minutes are for one tool. The two numbers to compare are wrong answer keys and minutes from page to link.',
        doneText: 'Now you know which one to trust.',
    },
};

export const COMPARISON_PAGES = {
    blooketGimkit: BLOOKET_GIMKIT,
    proctoring: PROCTORING,
    aiQuiz: AI_QUIZ,
} satisfies Record<string, HowtoPage>;
