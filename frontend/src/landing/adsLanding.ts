/**
 * Copy for the Google Ads landing pages testoza.com/quiz-creator and
 * testoza.com/assessment-platform (src/pages/GoogleAdsLanding.tsx).
 *
 * Plain, dependency-free TypeScript: the Cloudflare worker
 * (infrastructure/cloudflare-worker/worker.js) imports it for the head tags and
 * the crawlable body, so what Google and AdsBot read matches the page.
 *
 * ⚠️ Google Ads compliance (documentation/2026-07-03-google-ads-compliance-resolution.md):
 * testoza.com was disapproved once for "Circumventing systems". Keep proctoring
 * and browser-control words (full screen, tab switching, copy-paste blocking,
 * right click, back button, cheating) OFF these pages. No testimonials or ratings
 * unless they are real and permissioned; misrepresentation is also a policy.
 */

export interface AdsFaq {
    q: string;
    a: string;
}

export interface AdsLandingCopy {
    path: string;
    /** Browser tab and search title; already ends with the site name. */
    seoTitle: string;
    description: string;
    keywords: string[];
    eyebrow: string;
    /** The H1, drawn in two tones: `h1Lead` then `h1Rest`. */
    h1Lead: string;
    h1Rest: string;
    sub: string;
    /** Label of the main button (it always opens the AI test creator, ADS_CTA.href). */
    ctaLabel: string;
    /** Section headings, kept to a few words each. */
    waysTitle: string;
    stepsTitle: string;
    gridTitle: string;
    tryTitle: string;
    audienceTitle: string;
    closingTitle: string;
    closingSub: string;
    faqs: AdsFaq[];
}

export const ADS_CTA = { href: '/generate-with-ai' } as const;

/** Where material comes from. Each links to the page that explains it. */
export const ADS_SOURCES = [
    { id: 'pdf', label: 'PDF', caption: 'Chapters, notes, papers', href: '/pdf-to-quiz' },
    { id: 'photo', label: 'Photo', caption: 'Snap a textbook page', href: '/create-mock-test-online' },
    { id: 'youtube', label: 'YouTube', caption: 'Any lesson video', href: '/youtube-to-quiz' },
    { id: 'text', label: 'Text', caption: 'Paste or type', href: '/ai-question-generator' },
] as const;

export const ADS_STEPS = [
    { title: 'Upload', caption: 'A PDF, photos, Word file or a video link.' },
    { title: 'Review', caption: 'AI drafts the questions. Edit anything.' },
    { title: 'Share', caption: 'One link. Answers grade themselves.' },
] as const;

export const ADS_AUDIENCES = [
    {
        id: 'teachers',
        label: 'Teachers',
        points: ['Chapter quizzes in minutes', 'Auto-graded, every time', 'Share on WhatsApp or Classroom'],
    },
    {
        id: 'coaching',
        label: 'Coaching',
        points: ['Weekly mock tests from old papers', 'Negative marking & sections', 'Rank list for the batch'],
    },
    {
        id: 'students',
        label: 'Students',
        points: ['Photograph a chapter, get a test', 'Real exam-style screen', 'See where your time went'],
    },
] as const;

/** The "Try one" question. */
export const ADS_SAMPLE = {
    subject: 'Physics',
    question: 'A car covers 150 km in 2.5 hours. What is its average speed?',
    options: ['50 km/h', '60 km/h', '65 km/h', '75 km/h'],
    correct: 1,
    explanation: 'Speed = distance ÷ time = 150 ÷ 2.5 = 60 km/h.',
} as const;

const SHARED_FAQS: AdsFaq[] = [
    {
        q: 'Is TestoZa free?',
        a: 'Yes. Creating tests, the AI generator, sharing with unlimited students and auto-grading are free. Paid plans add your institute’s name and logo, Excel exports and more.',
    },
    {
        q: 'What can I make a quiz from?',
        a: 'A PDF, Word or PowerPoint file, photos of a textbook or question paper, a YouTube lesson, or text you paste or type.',
    },
    {
        q: 'Do students need an account?',
        a: 'No. Students open the link in any phone or laptop browser. There is no app to install.',
    },
    {
        q: 'Can I edit the AI’s questions?',
        a: 'Yes. Every question, option, answer and mark can be changed before you share the quiz.',
    },
    {
        q: 'Does it work in Hindi?',
        a: 'Yes. Questions can be in English, Hindi, or both together.',
    },
];

export const ADS_LANDING: Record<'quiz' | 'assessment', AdsLandingCopy> = {
    quiz: {
        path: '/quiz-creator',
        seoTitle: 'Free AI Quiz & Test Generator for Teachers | TestoZa',
        description:
            'Create quizzes and tests in minutes with AI. Turn PDFs, photos, notes or YouTube lessons into auto-graded quizzes and share them with one link. Free to start.',
        keywords: ['quiz creator', 'ai quiz generator', 'free quiz maker', 'create quiz online', 'quiz maker for teachers', 'pdf to quiz'],
        eyebrow: 'Free AI quiz creator',
        h1Lead: 'Create a quiz in minutes.',
        h1Rest: 'From any PDF, photo or notes.',
        sub: 'Upload your material. Get an auto-graded quiz. Share one link.',
        ctaLabel: 'Create a quiz free',
        waysTitle: 'Start from anything.',
        stepsTitle: 'Three steps. That’s it.',
        gridTitle: 'Everything a quiz needs.',
        tryTitle: 'Try one.',
        audienceTitle: 'Made for your classroom.',
        closingTitle: 'Your first quiz is minutes away.',
        closingSub: 'Free to start. No card needed.',
        faqs: SHARED_FAQS,
    },
    assessment: {
        path: '/assessment-platform',
        seoTitle: 'CBT & Online Assessment Platform | Free Exam Creator | TestoZa',
        description:
            'Create, share and grade computer-based tests online. A real exam-style screen, instant scoring with negative marking, and clear reports for every student.',
        keywords: ['online assessment platform', 'cbt exam software', 'computer based test', 'online exam creator', 'classroom assessment'],
        eyebrow: 'Online assessment platform',
        h1Lead: 'Computer-based tests,',
        h1Rest: 'ready in minutes.',
        sub: 'A real exam screen, instant grading and clear reports.',
        ctaLabel: 'Create a test free',
        waysTitle: 'Bring your papers.',
        stepsTitle: 'Create. Share. Grade.',
        gridTitle: 'Built for real exams.',
        tryTitle: 'Feel the exam screen.',
        audienceTitle: 'For every kind of classroom.',
        closingTitle: 'Run your next test online.',
        closingSub: 'Free to start. No card needed.',
        faqs: [
            {
                q: 'What is a computer-based test (CBT)?',
                a: 'An exam taken on a screen instead of paper. TestoZa gives students a numbered question palette, Mark for Review and a timer, like major computer-based exams.',
            },
            ...SHARED_FAQS,
        ],
    },
};

export const adsLandingFor = (pathname: string): AdsLandingCopy =>
    pathname.startsWith('/assessment-platform') ? ADS_LANDING.assessment : ADS_LANDING.quiz;

const esc = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** FAQPage structured data, built from the same FAQs the page shows. */
export const adsFaqSchema = (copy: AdsLandingCopy) => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: copy.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
});

/** The page as plain HTML for crawlers that don't run JavaScript (the worker puts it in <main>). */
export function adsCrawlerHtml(copy: AdsLandingCopy): string {
    return `
<p>${esc(copy.eyebrow)}</p>
<h1>${esc(`${copy.h1Lead} ${copy.h1Rest}`)}</h1>
<p>${esc(copy.sub)}</p>
<p><a href="${ADS_CTA.href}">${esc(copy.ctaLabel)}</a></p>
<h2>${esc(copy.waysTitle)}</h2>
<ul>${ADS_SOURCES.map((s) => `<li><a href="${s.href}">${esc(s.label)}</a>: ${esc(s.caption)}</li>`).join('')}</ul>
<h2>${esc(copy.stepsTitle)}</h2>
<ol>${ADS_STEPS.map((s) => `<li><strong>${esc(s.title)}.</strong> ${esc(s.caption)}</li>`).join('')}</ol>
<h2>${esc(copy.gridTitle)}</h2>
<ul>
<li>Single and multiple correct MCQs, numerical answers and passages, with maths formulas.</li>
<li>Instant results with scores, accuracy and time per question.</li>
<li>English, Hindi or both.</li>
<li>Works in any phone or laptop browser. No app to install.</li>
<li>Free to start: unlimited quizzes and students.</li>
<li>Share one link on WhatsApp, email or Google Classroom.</li>
</ul>
<h2>${esc(copy.audienceTitle)}</h2>
<ul>${ADS_AUDIENCES.map((a) => `<li><strong>${esc(a.label)}:</strong> ${a.points.map(esc).join('; ')}.</li>`).join('')}</ul>
<h2>Frequently asked questions</h2>
${copy.faqs.map((f) => `<h3>${esc(f.q)}</h3>\n<p>${esc(f.a)}</p>`).join('\n')}
<h2>${esc(copy.closingTitle)}</h2>
<p>${esc(copy.closingSub)} <a href="${ADS_CTA.href}">${esc(copy.ctaLabel)}</a> · <a href="/pricing">Pricing</a></p>
`;
}
