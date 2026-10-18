/**
 * Common questions on the Help page and /support (also the FAQPage schema there).
 *
 * Written from where teachers really get stuck: the one real support message so far
 * ("I created a test, I could not find it") and the Oct 2026 diagnosis of why teachers
 * don't send their tests. Add a question here when the same thing is asked twice;
 * keep answers short and name the button exactly as it reads in the app.
 */

export interface HelpFaq {
    q: string;
    a: string;
    /** In-app link shown under the answer. */
    link?: { label: string; to: string };
}

export const HELP_FAQS: HelpFaq[] = [
    {
        q: 'I saved my test. Where is it?',
        a: 'Open My Tests from the menu. Your newest test is at the top of "All tests". Tests running as an exam right now sit above them, under "Live exams".',
        link: { label: 'Open My Tests', to: '/my-tests' },
    },
    {
        q: 'How do I send a test to my students?',
        a: 'In My Tests, press "Conduct exam" on the test\'s card and start it. Then press Copy link or Share on the live exam and send the link to your class group on WhatsApp.',
        link: { label: 'Go to My Tests', to: '/my-tests' },
    },
    {
        q: 'Do candidates need an account or an app?',
        a: 'No. They open the link in any browser, type their name and start. If you want them to sign in first, turn that on in the exam\'s Settings.',
    },
    {
        q: 'Can I make a test from a PDF or a photo of a paper?',
        a: 'Yes. Open Generate with AI and upload the PDF or photo. It reads the questions, formulas and diagrams; check them and the answer key before you save.',
        link: { label: 'Generate with AI', to: '/generate-with-ai' },
    },
    {
        q: 'How do I stop candidates from cheating?',
        a: 'Open Settings on the live exam and turn on full screen, tab-switch alerts and copy-paste block. Do it before candidates join.',
    },
    {
        q: 'Where do I see marks?',
        a: 'Press Results on the exam in My Tests. Marks appear as each candidate submits, and you can download them as an Excel sheet.',
    },
    {
        q: 'Is there negative marking?',
        a: 'Only if you set it. Every new test starts with 0 negative marks; change it under Marking in the test builder.',
    },
    {
        q: 'Can I make tests in Hindi?',
        a: 'Yes. Type questions in Hindi directly, or use the 文A switch in the test builder to add a second language to each question.',
    },
    {
        q: 'Is TestoZa free?',
        a: 'Yes. Making tests and running exams is free, and the paid features are unlocked for everyone right now.',
    },
];
