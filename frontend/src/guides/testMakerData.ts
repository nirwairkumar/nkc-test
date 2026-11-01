/**
 * Five guides of 30 October 2026 that run on the "how to" shell (pages/guides/howto/HowToPage.tsx)
 * with its widgets as they are, and no new components or styles:
 *
 *   /sectional-test-maker                  /online-test-for-tuition-teachers
 *   /cbse-online-test-maker                /scholarship-admission-test-platform
 *   /online-test-with-negative-marking
 *
 * Kept out of howtoData.ts so that file's four pages stay as they were. Each page uses
 * hw-compare and hw-scenarios; its `steps` are shown as a plain numbered list (stepsFallback),
 * which reads better on a phone than the checklist widget.
 *
 * Plain, dependency-free TypeScript: the Cloudflare worker imports it too.
 *
 * Product facts were checked against the code on 30 October 2026:
 *   - sections: builder "Time each section" (utils/sectionTiming.ts): sections open in the
 *     paper's order, close when their minutes are up, can't be reopened or left early, time left
 *     over is lost, the test's time is the sum; refresh and rejoin land in the open section.
 *     Section "Attempt limit": "Students may answer at most N", Hard (stop them answering more)
 *     or Soft (they can answer more, only some count: the first ones answered, or the
 *     best-scoring ones). Merge and split sections from the "+" between them. Shuffling keeps
 *     questions inside their section. Candidates' result shows each section's score, right,
 *     wrong and skipped (ResultsPage sectionData); the creator's report has a sections card.
 *   - marking: every question has Marks and Wrong (decimals only: the box takes digits and a
 *     point, so a third is typed 0.3333); the Marking switch reads "No negative marking" or
 *     "JEE / NEET (+4, −1)", plus "Custom" when questions differ; new questions start at 1 mark,
 *     0 wrong. Multiple-correct: Proportional or JEE Advanced partial marks. Numerical answers
 *     by range or exact value. Blank = 0.
 *   - question types: Single correct, Multiple correct, Numerical answer, Passage / case study
 *     (questions grouped under one passage, kept together).
 *   - candidates: Candidate inputs (Name by default; Roll No, Batch, Phone… as labels) are
 *     columns in the Excel export; test link schedule (start and end time); live exams with a
 *     join code, check-in by name / roll / roll + PIN, PIN slips to print, walk-ins allowed or
 *     not; results "When the exam ends", "Right after each candidate submits" or "When I
 *     release them"; testoza.com/join/result lets a candidate look a result up later.
 *   - results: rank list, Excel export, report cards, parent WhatsApp note (and one for absent
 *     candidates) for batches with parents' numbers; nothing is sent on its own.
 */
import type { HowtoPage } from './howtoData';

// ── /sectional-test-maker ───────────────────────────────────────────────────

const SECTIONAL: HowtoPage = {
    key: 'sectional',
    hero: {
        title: 'One paper, four sections, four sets of rules',
        tag: 'Sections',
        groups: [
            {
                label: 'What a section can have',
                icon: 'layers',
                rows: [
                    { icon: 'timer', label: 'Its own minutes, closing when they run out' },
                    { icon: 'list-ordered', label: 'An attempt limit: “answer any 20 of 25”' },
                    { icon: 'minus-circle', label: 'Its own marks and negative marks' },
                    { icon: 'refresh-cw', label: 'Questions shuffled inside it, never out of it' },
                ],
            },
            {
                label: 'What you get back',
                icon: 'sparkles',
                us: true,
                rows: [
                    { icon: 'bar-chart-3', label: 'Marks, right, wrong and skipped per section' },
                    { icon: 'alert-triangle', label: 'The section that is pulling the score down' },
                    { icon: 'users', label: 'A rank list for the whole paper' },
                ],
            },
        ],
        foot: 'A one-section drill and a full sectioned mock are built the same way.',
    },
    stats: [
        { dt: 'SSC CGL Tier 1, each section', dd: '15', small: 'min' },
        { dt: 'Bank prelims, each section', dd: '20', small: 'min' },
        { dt: 'Rules a section can carry', dd: '4' },
        { dt: 'To build a sectional test', dd: '₹0' },
    ],
    checked: 'Section rules checked against the TestoZa builder and exam screen on 30 October 2026',
    compare: {
        title: 'One clock for the paper, or one clock per section',
        themLabel: 'One clock for the paper',
        usLabel: 'A clock per section',
        themes: [
            {
                id: 'time',
                label: 'Spare time',
                question: 'Where do the minutes saved in one section go?',
                them: ['Anywhere. A student who rushes General Awareness in 7 minutes spends the spare 8 on Maths.'],
                us: ['Nowhere. A section closes when its minutes are up, and the next one won’t open sooner, so spare minutes go on re-checking.'],
                takeaway: 'If the real exam times its sections, a mock on one clock lets students practise with minutes they won’t get on the day.',
            },
            {
                id: 'skip',
                label: 'Skipping',
                question: 'What happens to a question a student skips?',
                them: ['They come back to it at the end, if there is time left.'],
                us: ['There is no “at the end” for a closed section. A skipped question stays unanswered once its section closes.'],
                takeaway: 'Students need a skip rule they decide before the paper, such as “if I can’t start it in 20 seconds, I leave it”.',
            },
            {
                id: 'weak',
                label: 'A bad section',
                question: 'What does one bad section do to the rest of the paper?',
                them: ['It can eat the whole paper. Twenty stubborn minutes on one puzzle leave English half done.'],
                us: ['It stays in its own box. A disaster in Quant can’t take minutes from English.'],
                takeaway: 'Timed sections are harder on slow sections and kinder to panicky students. Both are worth telling a batch.',
            },
            {
                id: 'reload',
                label: 'Refresh',
                question: 'Can a refresh or a second phone reopen a closed section?',
                them: ['Not relevant: nothing is ever closed.'],
                us: ['No. The open section is worked out from the time left, so a refresh or another phone lands in the section open now.'],
                takeaway: 'Locks that a refresh can undo teach nothing. Test this on any software you use.',
            },
            {
                id: 'result',
                label: 'The result',
                question: 'What can you learn from the result?',
                them: ['A total and subject-wise marks. Each student split the time their own way, so speed problems stay hidden.'],
                us: ['Marks, right, wrong and skipped per section, on the same minutes for everyone. Many skips: speed. Many wrong: knowledge or guessing.'],
                takeaway: 'Equal minutes make section results comparable across a batch.',
            },
        ],
        caption: 'The left column is how most online tests work by default. Both are useful: one clock for JEE and NEET papers, a clock per section for SSC, bank and CAT patterns.',
    },
    scenarios: {
        title: 'What happens when…',
        sub: 'Pick a moment from a timed-sections paper.',
        columns: ['On the exam screen', 'In the result', 'Tell the batch'],
        items: [
            {
                id: 'early',
                label: 'Finishes early',
                icon: 'clock',
                title: 'A student finishes a section with 6 minutes left',
                lines: [
                    'The section stays open until its time ends. They can change answers in it, but the next section won’t open sooner.',
                    'Nothing special: their answers count as they stand when the section closes.',
                    'Spare minutes belong to the same section. Re-check the answers you were unsure of.',
                ],
            },
            {
                id: 'closes',
                label: 'Time runs out',
                icon: 'timer',
                title: 'A section’s time runs out mid-question',
                lines: ['The section closes and the next one opens with its own full minutes. Answers already given are kept.', 'Unanswered questions in that section count as skipped.', 'Answer as you go. There is no review screen at the end of a section.'],
            },
            {
                id: 'back',
                label: 'Wants to go back',
                icon: 'lock',
                title: 'A student wants to go back to an earlier section',
                lines: ['Closed sections can’t be reopened, not by tapping, refreshing or joining on another phone.', 'Their answers in the closed section are exactly what they were at closing time.', 'Decide in the section. Once it closes, it is gone, as in the real exam.'],
            },
            {
                id: 'limit',
                label: 'Hits the limit',
                icon: 'list-ordered',
                title: 'A student reaches a section’s attempt limit',
                lines: [
                    'With a hard limit they can’t answer more until they clear one. With a soft limit they can keep answering.',
                    'With a soft limit, only the first answers count, or only the best-scoring ones, whichever you chose.',
                    'Read the section instructions: “any 20 of 25” means choosing which 20, not answering all 25.',
                ],
            },
            {
                id: 'late',
                label: 'Joins late',
                icon: 'user-check',
                title: 'A student joins a live exam ten minutes late',
                lines: ['Inside the late-entry minutes you allow, they still get the paper’s full time, so every section keeps its minutes and the paper ends later for them.', 'Their row shows when they started, and their sections close on their own clock.', 'Late entry closes after the minutes the examiner set. Don’t count on it.'],
            },
            {
                id: 'extra',
                label: 'Extra time',
                icon: 'refresh-cw',
                title: 'You give one student extra time',
                lines: ['The extra minutes go to the section that is open now. Earlier sections stay closed.', 'Everything else is marked as usual.', 'Nothing to tell. Use it for a dropped signal or a dead phone.'],
            },
        ],
        caption: 'Each answer is what the exam screen does today on a test with “Time each section” switched on. Attempt limits work with or without section timing.',
    },
    steps: {
        title: 'Make a sectional test',
        sub: 'From an empty test to a link.',
        items: [
            { id: 'paper', title: 'Get the questions in', detail: 'Upload the paper as a PDF or photos and let the AI read it, or type the questions in the builder.', minutes: 8 },
            { id: 'sections', title: 'Split them into sections', detail: 'Use the “+” between questions to split a section and the “+” between sections to merge two. Name each one as the exam does.', minutes: 3 },
            { id: 'time', title: 'Switch on “Time each section”', detail: 'Type each section’s minutes. The test’s time becomes their total. Leave it off for papers like JEE and NEET that run on one clock.', minutes: 2 },
            { id: 'limits', title: 'Add attempt limits where needed', detail: 'Open a section’s Attempt limit, type the most a student may answer, and choose Hard or Soft.', minutes: 2 },
            { id: 'marks', title: 'Set the marking', detail: 'Marks and Wrong on each question. Sections can differ: +1/−0.25 in one, +2/−0.5 in the next.', minutes: 3 },
            { id: 'try', title: 'Sit it once yourself', detail: 'Use short minutes for a trial, watch one section close, then set the real minutes and share.', minutes: 5 },
        ],
        caption: 'Minutes are for a paper of about 50 questions you already have as a PDF.',
        doneText: 'Ready for the batch.',
    },
};

// ── /online-test-for-tuition-teachers ───────────────────────────────────────

const TUITION: HowtoPage = {
    key: 'tuition',
    hero: {
        title: 'A weekly test for a tuition batch',
        tag: 'Tuition',
        groups: [
            {
                label: 'What you already have',
                icon: 'file-text',
                rows: [
                    { icon: 'file-text', label: 'The textbook exercise you taught this week' },
                    { icon: 'message-circle', label: 'A WhatsApp group with every student' },
                    { icon: 'smartphone', label: 'Students with a phone at home' },
                ],
            },
            {
                label: 'What one evening gives you',
                icon: 'sparkles',
                us: true,
                rows: [
                    { icon: 'sparkles', label: 'A test made from a photo of that page' },
                    { icon: 'link', label: 'A link they open with no app and no login' },
                    { icon: 'bar-chart-3', label: 'Marks and ranks the moment they finish' },
                    { icon: 'message-circle', label: 'A message ready for each parent' },
                ],
            },
        ],
        foot: 'No institute software, no app to install, no per-student fee.',
    },
    stats: [
        { dt: 'Apps your students install', dd: '0' },
        { dt: 'From a photo to a test, about', dd: '15', small: 'min' },
        { dt: 'Papers to check by hand', dd: '0' },
        { dt: 'A whole year, at most', dd: '₹799' },
    ],
    checked: 'Steps checked against the live product on 30 October 2026',
    compare: {
        title: 'A paper test in the register, and a test on their phones',
        themLabel: 'Paper test and register',
        usLabel: 'An online test',
        themes: [
            {
                id: 'make',
                label: 'Making it',
                question: 'How long does the test take to prepare?',
                them: ['Writing questions by hand, then photocopies for every student, or writing it on the board and losing half the class time.'],
                us: ['Photograph the exercise page or upload a PDF. The AI reads the questions and answers into the test, and you check them. About 15 minutes for 20 questions.'],
                takeaway: 'The test you skip because it takes too long to make is the one your students needed.',
            },
            {
                id: 'check',
                label: 'Checking it',
                question: 'Who checks forty answer sheets?',
                them: ['You, at night, with a red pen. Results reach students next week, when they have forgotten the questions.'],
                us: ['Nobody. Each student sees their marks, the right answers and their mistakes the moment they submit.'],
                takeaway: 'Feedback the same day is worth far more than feedback next week. Students remember why they picked the wrong option.',
            },
            {
                id: 'absent',
                label: 'Absent students',
                question: 'What about students who miss the class?',
                them: ['They miss the test, or you set a separate one for them later.'],
                us: ['The link works from home. Send it to the group and they sit it the same evening, on the same paper.'],
                takeaway: 'An online test turns “absent on test day” into “took it at 8 pm”.',
            },
            {
                id: 'parents',
                label: 'Parents',
                question: 'How do parents find out how their child is doing?',
                them: ['At the parents’ meeting, from your memory and a register of marks.'],
                us: ['A ready-written WhatsApp message with the marks, rank and class average, one tap per parent. You send it; nothing goes out on its own.'],
                takeaway: 'Parents who hear something every week stay. A message after each test is the cheapest retention you will ever do.',
            },
            {
                id: 'record',
                label: 'The record',
                question: 'What do you have after three months?',
                them: ['A notebook of marks, some missing, impossible to compare.'],
                us: ['Every test’s results in one place, an Excel sheet when you want one, and report cards you can print.'],
                takeaway: 'When a parent asks “is my child improving?”, you can show them instead of guessing.',
            },
        ],
        caption: 'Written tests in a notebook still have their place, especially for long answers. Use online tests for the objective part, every week.',
    },
    scenarios: {
        title: 'Your situation',
        sub: 'Pick what your tuition looks like this month.',
        columns: ['What to do', 'In TestoZa', 'Time it takes'],
        items: [
            {
                id: 'weekly',
                label: 'Weekly test',
                icon: 'clock',
                title: 'A test on what you taught this week',
                lines: ['Twenty questions from this week’s chapter, every Saturday, same time.', 'Photograph the exercise page, check the questions, share the link in the group.', 'About 15 minutes to make. Marking takes none.'],
            },
            {
                id: 'mixed',
                label: 'Mixed classes',
                icon: 'layers',
                title: 'Class 8, 9 and 10 in the same room',
                lines: ['A separate short test for each class, sent to each class’s group.', 'Make one test, then a second from another chapter. Each has its own link and its own results.', 'About 10 minutes per class once you have done it once.'],
            },
            {
                id: 'exams',
                label: 'Before exams',
                icon: 'timer',
                title: 'Board or school exams in four weeks',
                lines: ['A longer test each week covering several chapters, timed like the real paper.', 'Upload last year’s question paper as a PDF, set the time, and keep the marking as the board does it.', 'Half an hour to set up a full paper.'],
            },
            {
                id: 'holiday',
                label: 'Holidays',
                icon: 'smartphone',
                title: 'Diwali or summer holidays, no classes',
                lines: ['Two short tests a week so students keep practising at home.', 'Share links in advance. Students take them on their phones whenever they can.', 'Make them all in one sitting before the break.'],
            },
            {
                id: 'meeting',
                label: 'Parents’ meeting',
                icon: 'users',
                title: 'A parents’ meeting next Sunday',
                lines: ['Show each parent their child’s marks across the term, not just the last test.', 'Print report cards from results, or open the results on your phone.', 'Ten minutes to prepare for the whole batch.'],
            },
            {
                id: 'weak',
                label: 'A weak student',
                icon: 'user-check',
                title: 'One student keeps failing one topic',
                lines: ['A short test on just that topic, which they can take twice.', 'Generate ten questions from your notes on that topic and allow more than one attempt.', 'Five minutes.'],
            },
        ],
        caption: 'Making and sharing tests and seeing results cost nothing. Paid plans, from ₹49 for 7 days, add exam rules, your name and logo on tests, scheduling and Excel export.',
    },
    steps: {
        title: 'Your first weekly test',
        sub: 'One Saturday test, start to finish.',
        items: [
            { id: 'account', title: 'Sign up', detail: 'Use your Google account or email on testoza.com. No institute details needed.', minutes: 1 },
            { id: 'photo', title: 'Photograph the exercise page', detail: 'Or upload a PDF of last year’s paper. Choose Extract to copy the questions as printed, or Generate to make new ones from a chapter.', minutes: 4 },
            { id: 'check', title: 'Check every question and answer', detail: 'Fix any word the AI misread and make sure each correct answer is ticked.', minutes: 6 },
            { id: 'settings', title: 'Set time and marking', detail: 'Time in minutes, one mark each, no negative marking for school classes. Ask for name and roll number.', minutes: 2 },
            { id: 'share', title: 'Send the link to the group', detail: 'Tap Share, then WhatsApp. Students tap the link, type their name and start.', minutes: 1 },
            { id: 'results', title: 'Open the results after dinner', detail: 'Marks, ranks and who hasn’t taken it yet. Send parents their message if you have their numbers.', minutes: 3 },
        ],
        caption: 'Minutes are for a 20-question test from one textbook page.',
        doneText: 'Test done before tea.',
    },
};

// ── /cbse-online-test-maker ─────────────────────────────────────────────────

const CBSE: HowtoPage = {
    key: 'cbse',
    hero: {
        title: 'A CBSE paper, split by who marks it',
        tag: 'CBSE',
        groups: [
            {
                label: 'The online test sets and marks',
                icon: 'sparkles',
                us: true,
                rows: [
                    { icon: 'copy-check', label: 'MCQs, with one or more correct answers' },
                    { icon: 'list-ordered', label: 'Assertion and reason questions' },
                    { icon: 'file-text', label: 'Case-based questions under one passage' },
                    { icon: 'bar-chart-3', label: 'Numerical answers, within a range you set' },
                ],
            },
            {
                label: 'You keep on paper',
                icon: 'file-text',
                rows: [
                    { icon: 'bold', label: 'Short and long written answers' },
                    { icon: 'layout-template', label: 'Diagrams, maps and constructions students draw' },
                ],
            },
        ],
        foot: 'Practise the objective half every week online. Keep written practice in the notebook.',
    },
    stats: [
        { dt: 'Classes covered', dd: '6–12' },
        { dt: 'Negative marking in CBSE boards', dd: '0' },
        { dt: 'Class 10 board exams a year, from 2026', dd: '2' },
        { dt: 'To build a test', dd: '₹0' },
    ],
    checked: 'Question types checked against the TestoZa builder on 30 October 2026',
    compare: {
        title: 'Each part of a CBSE paper, and what an online test does with it',
        themLabel: 'In the CBSE paper',
        usLabel: 'In a TestoZa test',
        themes: [
            {
                id: 'mcq',
                label: 'MCQs',
                question: 'One-mark multiple choice questions',
                them: ['Four options, one correct, one mark, no negative marking. A whole section of most papers.'],
                us: ['Single correct questions at one mark with Wrong set to 0, which is how new tests start. Marked the moment the student submits.'],
                takeaway: 'This is the easiest part to practise online and the easiest to lose marks on through careless reading.',
            },
            {
                id: 'ar',
                label: 'Assertion–reason',
                question: 'Assertion (A) and Reason (R) questions',
                them: ['Two statements and the standard four options: both true and R explains A; both true but R doesn’t explain A; A true, R false; A false, R true.'],
                us: ['A single correct question with the assertion and reason in the question and the four standard options. The AI reads them from a sample paper as they are printed.'],
                takeaway: 'Students lose these marks on the difference between the first two options. Repetition fixes it.',
            },
            {
                id: 'case',
                label: 'Case-based',
                question: 'Case-based and source-based questions',
                them: ['A passage, a table or a data set, followed by several questions about it.'],
                us: ['The Passage / case study type: write or paste the passage once and add its questions under it, and they appear together. Leave question shuffling off for tests with case studies.'],
                takeaway: 'Competency-based questions reward reading the case slowly. Timed practice teaches that better than reading tips.',
            },
            {
                id: 'num',
                label: 'Numericals',
                question: 'Maths and science numericals',
                them: ['Worked on paper, with marks for the method and the answer.'],
                us: ['The Numerical answer type checks the final answer against a range you set, such as 9.7 to 9.9. It can’t see the working.'],
                takeaway: 'Use numerical questions to check the answer is right, and the notebook to check the method.',
            },
            {
                id: 'long',
                label: 'Written answers',
                question: '2-, 3- and 5-mark written answers',
                them: ['Explained in sentences, steps or diagrams, marked by a teacher against the marking scheme.'],
                us: ['Not marked online. TestoZa marks objective and numerical answers only.'],
                takeaway: 'Be wary of any tool that claims to mark a 5-mark answer well. Keep these on paper, with your own marking.',
            },
        ],
        caption: 'Question types follow CBSE’s published sample papers. The split between objective and written questions differs by subject and class, so check the year’s sample paper on cbseacademic.nic.in.',
    },
    scenarios: {
        title: 'Through the school year',
        sub: 'Pick the kind of test you are setting.',
        columns: ['What it covers', 'How to set it up', 'What to look at after'],
        items: [
            {
                id: 'chapter',
                label: 'Chapter test',
                icon: 'file-text',
                title: 'A test at the end of each chapter',
                lines: ['15 to 20 objective questions from the NCERT chapter and its exercises.', 'Photograph the exercise pages or upload the chapter PDF and choose Generate. One mark each, no negative marking.', 'Questions most of the class got wrong: re-teach those, not the whole chapter.'],
            },
            {
                id: 'periodic',
                label: 'Periodic test',
                icon: 'clock',
                title: 'The objective part of a periodic test',
                lines: ['Several chapters, in sections like the board paper: MCQs, assertion–reason, a case study.', 'Make a section for each question type and give the test the same minutes the objective part would get.', 'Section scores show whether a student loses marks on MCQs or on case studies.'],
            },
            {
                id: 'holiday',
                label: 'Holiday work',
                icon: 'smartphone',
                title: 'Practice over the holidays',
                lines: ['Short tests students take at home, with answers they can check.', 'Allow more than one attempt and show the solutions after submitting.', 'Who took them and who didn’t, before school opens.'],
            },
            {
                id: 'preboard',
                label: 'Pre-board',
                icon: 'timer',
                title: 'Practice before the pre-boards',
                lines: ['Last years’ objective questions, chapter by chapter, then mixed.', 'Upload CBSE sample papers as PDFs; the AI separates questions, options and the answer key.', 'The rank list, and the chapters where the class average is lowest.'],
            },
            {
                id: 'second',
                label: 'Second exam',
                icon: 'refresh-cw',
                title: 'Class 10 students taking the second board exam',
                lines: ['The same syllabus again, aimed at the chapters where they lost marks in February.', 'One short test per weak chapter, with more than one attempt allowed.', 'Whether the second attempt on each test scores higher than the first.'],
            },
            {
                id: 'hindi',
                label: 'Hindi medium',
                icon: 'bold',
                title: 'A Hindi-medium or bilingual class',
                lines: ['The same tests, in Hindi or with Hindi and English one under the other.', 'Type Hindi in English letters, or let the AI write Hindi from an English page.', 'Nothing different: results and reports work the same way.'],
            },
        ],
        caption: 'Every test type uses features available today. TestoZa does not mark written answers, so each card covers the objective part only.',
    },
    steps: {
        title: 'Your first CBSE chapter test',
        sub: 'From an NCERT chapter to a link.',
        items: [
            { id: 'source', title: 'Pick the source', detail: 'An NCERT exercise, a CBSE sample paper PDF or your own notes for the chapter.', minutes: 2 },
            { id: 'ai', title: 'Let the AI read it', detail: 'Extract copies printed questions as they are; Generate writes new ones from the chapter. Put each case study under one passage with the Passage / case study type.', minutes: 4 },
            { id: 'check', title: 'Check against the textbook', detail: 'Every question, option and answer. Fix anything outside the syllabus.', minutes: 8 },
            { id: 'marks', title: 'Keep CBSE marking', detail: 'One mark per question, no negative marking. Group questions into sections A, B and C if you want section scores.', minutes: 2 },
            { id: 'share', title: 'Share it', detail: 'A link in the class group, or a six-digit code if the class sits it together in the lab or the classroom.', minutes: 1 },
            { id: 'review', title: 'Review the questions most got wrong', detail: 'Open the results the same day and start the next class with those three or four questions.', minutes: 5 },
        ],
        caption: 'Minutes are for a 20-question chapter test.',
        doneText: 'Chapter tested.',
    },
};

// ── /scholarship-admission-test-platform ────────────────────────────────────

const SCHOLARSHIP: HowtoPage = {
    key: 'scholarship',
    hero: {
        title: 'One scholarship test, three results',
        tag: 'Admissions',
        groups: [
            {
                label: 'On test day',
                icon: 'users',
                rows: [
                    { icon: 'id-card', label: 'Candidates register with name, phone, class and school' },
                    { icon: 'key-round', label: 'They join with a code, at home or in your centre' },
                    { icon: 'shield-check', label: 'One attempt each, in a fixed window' },
                ],
            },
            {
                label: 'What you have by the evening',
                icon: 'sparkles',
                us: true,
                rows: [
                    { icon: 'list-ordered', label: 'A rank list for every class' },
                    { icon: 'bar-chart-3', label: 'Scores to turn into scholarship slabs' },
                    { icon: 'phone-call', label: 'Every family’s phone number, in one sheet' },
                ],
            },
        ],
        foot: 'A scholarship test fills batches, finds strong students and builds your enquiry list in one day.',
    },
    stats: [
        { dt: 'Attempts per candidate', dd: '1' },
        { dt: 'Places to sit it: home, centre, school', dd: '3' },
        { dt: 'A 7-day plan for the test week', dd: '₹49' },
        { dt: 'Fee per candidate', dd: '₹0' },
    ],
    checked: 'Candidate inputs, exports and results release checked in TestoZa on 30 October 2026',
    compare: {
        title: 'A scholarship test on paper, and one online',
        themLabel: 'On paper (OMR)',
        usLabel: 'Online with TestoZa',
        themes: [
            {
                id: 'register',
                label: 'Registration',
                question: 'How do candidates register?',
                them: ['Forms at the front desk or a Google Form, then typing names into a list for seating and admit cards.'],
                us: ['The details you ask for (name, phone, class, school) are the first screen of the test. They become columns in the results sheet.'],
                takeaway: 'Every list you retype is a list with mistakes in the phone numbers.',
            },
            {
                id: 'hall',
                label: 'The hall',
                question: 'Where can candidates sit it?',
                them: ['Only in a room you book, with invigilators and printed papers for everyone who might turn up.'],
                us: ['At home during a window you set, in your centre on their own phones, or in a school hall with a code on the board. Same paper everywhere.'],
                takeaway: 'Online, a family two hours away can still take your test. That is often where the new admissions come from.',
            },
            {
                id: 'checking',
                label: 'Checking',
                question: 'How long until the results are ready?',
                them: ['OMR sheets scanned, or checked by hand, over days. Mistakes in bubbling are argued over.'],
                us: ['Marked on submission, with a rank list for each paper. You decide when candidates see their result.'],
                takeaway: 'Families decide on admission while their interest is warm. Results in a day beat results in a week.',
            },
            {
                id: 'results',
                label: 'Results day',
                question: 'How do candidates get their results?',
                them: ['A list pinned outside the centre, or calls to the office.'],
                us: ['Hold results until you release them. On results day, candidates look theirs up at testoza.com/join/result with the details they typed at the start.'],
                takeaway: 'Announce results on a day you choose, with your counsellors ready for calls.',
            },
            {
                id: 'follow',
                label: 'Follow-up',
                question: 'What do you do with the candidates afterwards?',
                them: ['A pile of forms to sort by hand before anyone can call.'],
                us: ['One Excel sheet: rank, score, and every detail they typed, ready to sort by class or school and to share with counsellors.'],
                takeaway: 'Most families who don’t win a large scholarship still want a call. The sheet is your admission list.',
            },
        ],
        caption: 'Paper tests still make sense where candidates have no phone. Many institutes run both: online for most, a hall for the rest.',
    },
    scenarios: {
        title: 'How will candidates sit it?',
        sub: 'Pick the format you are planning.',
        columns: ['How candidates join', 'Settings to use', 'Watch out for'],
        items: [
            {
                id: 'home',
                label: 'From home',
                icon: 'smartphone',
                title: 'Online from home, in a set window',
                lines: ['A test link shared on WhatsApp, Instagram and your website, open from Sunday 10 am to 1 pm.', 'Schedule a start and end time, one attempt each, exam rules on, results released on the day you announce.', 'Home sittings can’t be invigilated. Use them for screening and modest scholarships.'],
            },
            {
                id: 'centre',
                label: 'In your centre',
                icon: 'users',
                title: 'In your centre, on candidates’ phones',
                lines: ['A six-digit code on the board, typed at testoza.com/join. Late entry closes after the minutes you set.', 'A live exam with roll number and PIN check-in, PIN slips printed for the desk, walk-ins allowed.', 'A few candidates without a phone. Keep two or three spare devices or printed papers.'],
            },
            {
                id: 'school',
                label: 'At schools',
                icon: 'layout-grid',
                title: 'At partner schools, one class at a time',
                lines: ['The code on the school board or a QR code on a poster. Students join on school tablets or their own phones.', 'One live exam per school, so each school has its own rank list and its own result day.', 'School Wi-Fi with 60 phones. Ask for a test run a day before.'],
            },
            {
                id: 'rounds',
                label: 'Two rounds',
                icon: 'layers',
                title: 'Online screening, then a final in the centre',
                lines: ['Everyone takes a short online test; the top candidates are invited to a supervised final.', 'Two tests: the first with a wide window, the second a live exam with a PIN for each invited candidate.', 'Big scholarships should be decided in the supervised round, never from home.'],
            },
            {
                id: 'classes',
                label: 'Many classes',
                icon: 'list-ordered',
                title: 'Candidates from Class 6 to Class 12',
                lines: ['Each class takes its own paper, chosen at the start.', 'One test per class, each with its own link or code. Ask for the class as a candidate detail anyway, as a check.', 'Sharing the wrong class’s link. Name the class in the test title and the link text.'],
            },
        ],
        caption: 'Every setting exists in TestoZa today. Scheduled windows, exam rules and the Excel export are on the paid plans; the 7-day plan (₹49) covers a test week.',
    },
    steps: {
        title: 'Plan the scholarship test',
        sub: 'Six weeks to results day.',
        items: [
            { id: 'rules', title: 'Write the rules first', detail: 'Eligible classes, test dates, the scholarship slabs and the tie-break rule. Publish them before anyone registers.', minutes: 30 },
            { id: 'papers', title: 'Set one paper per class', detail: 'An hour or so, mostly aptitude and subject questions from the previous class, with a few hard questions to separate the top ranks.', minutes: 120 },
            { id: 'details', title: 'Choose the candidate details', detail: 'Name, phone, class, school and city. Ask for what counsellors will use, nothing more.', minutes: 5 },
            { id: 'settings', title: 'Lock the settings', detail: 'One attempt, the date window, exam rules, and results held until you release them.', minutes: 10 },
            { id: 'trial', title: 'Run a trial with your own staff', detail: 'Ten staff phones, the real link, a short window. Check the sheet they produce.', minutes: 30 },
            { id: 'announce', title: 'Release results and call', detail: 'Release on the day you announced, add slabs in the sheet and give every counsellor their list.', minutes: 60 },
        ],
        caption: 'Minutes are your working time, not the six weeks of promotion around it.',
        doneText: 'Ready for admission season.',
    },
};

// ── /online-test-with-negative-marking ──────────────────────────────────────

const NEGATIVE: HowtoPage = {
    key: 'negative',
    hero: {
        title: 'Negative marking, set in two boxes',
        tag: 'Marking',
        groups: [
            {
                label: 'On every question',
                icon: 'minus-circle',
                rows: [
                    { icon: 'copy-check', label: 'Marks: 4, 2, 1 or any decimal' },
                    { icon: 'minus-circle', label: 'Wrong: 1, 0.5, 0.25 or 0.3333' },
                    { icon: 'clock', label: 'Left blank: always 0' },
                ],
            },
            {
                label: 'And for harder questions',
                icon: 'sparkles',
                us: true,
                rows: [
                    { icon: 'list-ordered', label: 'Partial marks: proportional or JEE Advanced' },
                    { icon: 'bar-chart-3', label: 'Numerical answers within a range' },
                    { icon: 'layers', label: 'Different marking in each section' },
                ],
            },
        ],
        foot: 'New tests start with no negative marking. You switch it on when the exam you’re preparing for uses it.',
    },
    stats: [
        { dt: 'JEE Main and NEET', dd: '+4 / −1' },
        { dt: 'SSC CGL Tier 1', dd: '+2 / −0.5' },
        { dt: 'Bank prelims, per question', dd: '−¼' },
        { dt: 'CBSE board exams', dd: 'None' },
    ],
    checked: 'Marking checked against the TestoZa builder and scoring on 30 October 2026',
    compare: {
        title: 'Practice without a penalty, and practice with the real one',
        themLabel: 'No penalty in practice',
        usLabel: 'The real penalty in practice',
        themes: [
            {
                id: 'habit',
                label: 'Guessing habit',
                question: 'What habit do students build over months of tests?',
                them: ['Answer everything. A blank is a wasted chance, so every question gets a tick.'],
                us: ['Answer when the odds are good. Students learn which questions to leave.'],
                takeaway: 'The real exam punishes the habit a penalty-free mock rewards. Months of practice should build the habit the exam needs.',
            },
            {
                id: 'score',
                label: 'The score',
                question: 'Does the practice score predict the real one?',
                them: ['No. It runs high, because wrong answers cost nothing.'],
                us: ['Yes, much more closely, because it is counted the same way.'],
                takeaway: 'A student scoring 180 in practice and 140 in the exam lost those marks in your mocks, not on the day.',
            },
            {
                id: 'accuracy',
                label: 'Accuracy',
                question: 'Can you see a student’s accuracy?',
                them: ['Only if you count it yourself. Marks and right answers are the same thing.'],
                us: ['Marks and right answers come apart. Twenty wrong answers at −1 are twenty marks you can point to.'],
                takeaway: 'Accuracy is the number to coach. Negative marking makes it visible in every result.',
            },
            {
                id: 'ranks',
                label: 'Ranks',
                question: 'Are ranks fair?',
                them: ['Lucky guessers rise. Careful students who left questions blank fall.'],
                us: ['Guessing at random evens out at zero or close to it, so ranks follow what students know.'],
                takeaway: 'If the exam ranks with negative marks, your rank list should too.',
            },
            {
                id: 'when',
                label: 'When not to',
                question: 'Is negative marking always right?',
                them: ['For school class tests, CBSE practice and the first weeks of a new batch, no penalty is the right choice.'],
                us: ['Switch it on when students start preparing for an exam that uses it, and tell them before the first test.'],
                takeaway: 'A penalty with no explanation just frightens students. Explain it once, with the arithmetic.',
            },
        ],
        caption: 'Both are useful. The marking of your practice tests should follow the exam your students will sit.',
    },
    scenarios: {
        title: 'Is a guess worth it?',
        sub: 'Pick an exam. Values are average marks gained per guess.',
        columns: ['The rule', 'A blind guess', 'Rule out one or two options'],
        items: [
            {
                id: 'jee',
                label: 'JEE · NEET',
                icon: 'copy-check',
                title: 'JEE Main and NEET: +4 right, −1 wrong, four options',
                lines: ['Right +4, wrong −1, blank 0.', '+0.25 marks on average, but ten blind guesses still end below zero about one time in four.', 'One option ruled out: +0.67. Two ruled out: +1.5. Guess when you can rule one out.'],
            },
            {
                id: 'ssc',
                label: 'SSC',
                icon: 'list-ordered',
                title: 'SSC CGL and CHSL Tier 1: +2 right, −0.5 wrong',
                lines: ['Right +2, wrong −0.5, blank 0, four options.', '+0.125 marks on average.', 'One ruled out: +0.33. Two ruled out: +0.75.'],
            },
            {
                id: 'bank',
                label: 'Bank',
                icon: 'layers',
                title: 'Bank exams: a quarter of the question’s marks, five options',
                lines: ['Wrong costs ¼ of the question’s marks; five options.', 'Exactly zero on average.', 'One ruled out: 1/16 of the question’s marks. Two: 1/6. Three: 3/8.'],
            },
            {
                id: 'cuet',
                label: 'CUET',
                icon: 'file-text',
                title: 'CUET UG: +5 right, −1 wrong, four options',
                lines: ['Right +5, wrong −1, blank 0.', '+0.5 marks on average: the penalty is mild for the size of the reward.', 'One ruled out: +1. Two ruled out: +2.'],
            },
            {
                id: 'thirds',
                label: 'GATE · UPSC',
                icon: 'minus-circle',
                title: 'GATE MCQs and UPSC prelims: a third of the marks',
                lines: ['Wrong costs a third of the question’s marks; four options. GATE’s multiple-select and numerical questions have no penalty.', 'Exactly zero on average. A third is the penalty that cancels blind guessing with four options.', 'One ruled out: +1/9 of the marks. Two ruled out: +1/3.'],
            },
            {
                id: 'cat',
                label: 'CAT',
                icon: 'bar-chart-3',
                title: 'CAT: +3 right, −1 wrong on multiple choice',
                lines: ['Right +3, wrong −1 on multiple choice; questions typed without options have no penalty.', 'Exactly zero on average for multiple choice.', 'One ruled out: +0.33. Two ruled out: +1. Always answer the typed-in questions.'],
            },
        ],
        caption: 'Worked out from each exam’s published marking. Averages hide the spread: a guess either gains or loses, so a few guesses can go either way.',
    },
    steps: {
        title: 'Set up a negative-marked test',
        sub: 'In the builder.',
        items: [
            { id: 'switch', title: 'Choose the marking at the top', detail: '“JEE / NEET (+4, −1)” sets every question in one tap. For anything else, set the questions themselves.', minutes: 1 },
            { id: 'boxes', title: 'Fill Marks and Wrong', detail: 'Type the penalty without a minus sign: 0.5 for SSC, 0.25 for a one-mark bank question, 0.3333 for a third.', minutes: 3 },
            { id: 'multi', title: 'Choose partial marks for multiple-correct questions', detail: 'Proportional, or JEE Advanced: +1 per correct option, any wrong option gets the Wrong mark.', minutes: 2 },
            { id: 'numerical', title: 'Decide numericals separately', detail: 'Give numerical questions their own Wrong mark, or 0 where the exam doesn’t penalise them.', minutes: 2 },
            { id: 'check', title: 'Read the summary line', detail: 'It says the penalty per wrong answer and the total marks. Check it matches the exam.', minutes: 1 },
            { id: 'tell', title: 'Tell students before the first test', detail: 'Put the marking in the test description, with the rule for when to guess.', minutes: 2 },
        ],
        caption: 'Minutes are for a paper that is already built.',
        doneText: 'Marked like the real thing.',
    },
};

export const TEST_MAKER_PAGES = {
    sectional: SECTIONAL,
    tuition: TUITION,
    cbse: CBSE,
    scholarship: SCHOLARSHIP,
    negative: NEGATIVE,
} satisfies Record<string, HowtoPage>;
