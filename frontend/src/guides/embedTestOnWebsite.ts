/**
 * testoza.com/embed-test-on-website — how to put an online test on your own website
 * (WordPress, Google Sites, Wix, Blogger, Squarespace, Webflow, Shopify, plain HTML),
 * with a generator for the code. Written for teachers, institutes and bloggers.
 *
 * The honest core of this page: TestoZa tests cannot be shown inside another site's
 * iframe. Every testoza.com host answers with X-Frame-Options: SAMEORIGIN and
 * frame-ancestors 'self' (checked live with curl on 13 October 2026), so the page teaches
 * the launcher pattern — a button, card, code box or QR code that opens the test in its
 * own tab — and says why that is better for an exam, and when an iframe quiz tool is the
 * better choice. Never imply an iframe embed, an API, webhooks, single sign-on with the
 * reader's website, or results appearing on their site.
 *
 * Builder menu names (Custom HTML block, Embed code, Embed HTML, HTML/JavaScript gadget,
 * Code block, Code Embed, Custom Liquid) as each builder documents them in 2026.
 */
import { HOWTO_PAGES } from './howtoData';
import { buildersTable, compareFallback, embedFallback, stepsFallback } from './howtoFallback';
import { EMBED_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const P = HOWTO_PAGES.embed;

export const EMBED_TEST_ON_WEBSITE: Guide = {
    meta: EMBED_META,
    body: {
        intro: [
            html(`
<p>You have a website — a WordPress site for your coaching institute, a Google Site for your class, a Blogger page where you post notes — and you have a test. You want the two in the same place, so students who visit the site can take the test without hunting for a link in an old WhatsApp message.</p>
<p>“Embed” is the word everybody searches for, and it hides a choice most guides skip. You can put <em>the test itself</em> inside your page, in a frame, the way a YouTube video sits inside a blog post. Or you can put <em>a way into the test</em> on your page — a button, a card, a box for the day’s exam code, a QR code — that opens the exam in its own tab, full size.</p>
<p>For a quiz of five questions at the end of a blog post, the first is fine. For an exam with a clock, marks and rules, the second is better on every count that matters, and it is the only one TestoZa supports. This guide explains why, gives you the code for your own test, and shows exactly where to paste it on eight website builders.</p>
`),
        ],

        answer:
            'To put a TestoZa test on your website, add a button, card, code box or QR code that links to the test and opens it in a new tab — paste the HTML into a Custom HTML block (WordPress), Embed code (Google Sites), Embed HTML (Wix) or an HTML/JavaScript gadget (Blogger), or use the builder’s own button with the test’s link. The code needs no plugin and no script. TestoZa does not run inside an iframe on another site: its pages send X-Frame-Options: SAMEORIGIN, so browsers refuse to frame them. That is deliberate, because an exam needs the whole screen, working full-screen and tab-switch rules, and answers saved in one place — none of which a frame inside someone else’s page reliably gives. Results go to your TestoZa dashboard, not to your website.',

        sections: [
            {
                id: 'two-meanings',
                title: 'Two things “embed a test” can mean',
                tocLabel: 'Two meanings',
                kicker: 'Start here',
                blocks: [
                    html(`
<p>Before choosing a tool, decide which of these you want. They solve different problems.</p>
<h3>1. The questions inside your page</h3>
<p>An <strong>iframe embed</strong>: a box on your page that shows another website inside it. The visitor scrolls your page, reaches the box, and answers the questions without leaving. This is how Google Forms, Typeform and most quiz widgets are embedded. It suits short, low-stakes things — a five-question check at the end of a lesson, a poll, a sign-up form — where staying on the page matters more than the screen space.</p>
<h3>2. A way into the test from your page</h3>
<p>A <strong>launcher</strong>: something on your page that opens the test in its own tab. A “Start the test” button in your text, a card with the test’s name, number of questions and time, a box that says “Exam today? Enter your code”, or a QR code on a printed sheet. The visitor taps it, the exam opens full size, and your page stays open behind it for when they finish.</p>
<p>The rest of this guide is about the second, because it is what an exam needs, and because it is what works with TestoZa. If what you actually need is the first — a short ungraded quiz living inside a blog post — the honest advice is to use a form tool built for that, and keep the exams that count somewhere built for exams.</p>
`),
                ],
            },
            {
                id: 'iframe',
                title: 'Why the test opens in its own tab',
                tocLabel: 'Why not an iframe',
                kicker: 'The honest part',
                blocks: [
                    html(`
<p>The short version first: <strong>a TestoZa test cannot be shown inside an iframe on another website.</strong> Every TestoZa page tells browsers not to display it inside someone else’s frame, using two standard headers — <code>X-Frame-Options: SAMEORIGIN</code> and a content security policy of <code>frame-ancestors 'self'</code>. If you paste a test link into an iframe anyway, the browser shows an empty box or a message that the site “refused to connect”.</p>
<p>That is a security setting, not an oversight. A page that can be framed by any website can be dressed up by any website — covered with a fake button, overlaid with a different form — which is why banks, email providers and most serious web applications refuse to be framed. An exam page carries a candidate’s answers and marks, so it gets the same protection.</p>
<p>But even if the setting were off, an exam is a poor fit for a frame, for reasons that have nothing to do with TestoZa:</p>
<ul class="al-list">
<li><strong>The screen.</strong> A frame gets whatever space your page leaves it. On a phone, with your site’s header and menu above and the keyboard below, that can be a strip a few centimetres tall, scrolling inside a page that also scrolls.</li>
<li><strong>Exam rules.</strong> Full screen inside a frame only works if the embed code grants it, and many website builders don’t let you edit that. Your own site’s pop-ups, chat bubbles and cookie banners sit on top of the test.</li>
<li><strong>Saved answers and sign-ins.</strong> Modern browsers keep a framed page’s storage separate from the same site opened directly (Chrome, Firefox and Safari all partition it). A candidate signed in to the exam in one tab is a stranger to the same exam inside your frame. Google sign-in pages refuse to open in frames at all.</li>
<li><strong>Your page speed.</strong> A frame loads a whole web application inside your page, usually on every visit, whether or not anybody takes the test. A button costs a few hundred bytes.</li>
</ul>
<p>A launcher avoids all four. The test opens in its own tab with the whole screen, every rule works, answers are saved in one place, and your page stays light. The only thing you give up is the visitor seeing the questions without a tap — and for an exam, that tap is a feature: it is the moment the candidate decides to start.</p>
`),
                ],
            },
            {
                id: 'get-the-code',
                title: 'Get the code for your test',
                tocLabel: 'Get the code',
                kicker: 'The generator',
                blocks: [
                    html(`
<p>Paste your test’s link below — or a six-digit join code — and pick what you want on your page. The code updates as you type, and the preview shows exactly what your visitors will see. Nothing is sent anywhere: the code is written in your browser.</p>
`),
                    { type: 'widget', widget: 'hw-embed', fallbackHtml: embedFallback() },
                    html(`
<p>The four styles, and when to use each:</p>
<ul class="al-list">
<li><strong>Button.</strong> One line that sits in your text: under a lesson, at the end of a notes page, beside a chapter title. Use it when the words around it already explain the test.</li>
<li><strong>Card.</strong> The test’s name, its facts (questions, minutes, “no account needed”) and a button, in a box. Use it on a page of its own — a “Tests” or “Practice papers” page — where each test needs to introduce itself.</li>
<li><strong>Code box.</strong> For live exams. A live exam has a new six-digit code each sitting, so instead of updating your website every week, the box points at testoza.com/join, where candidates type the day’s code. Put it on your site once and never touch it again.</li>
<li><strong>QR code.</strong> For things that are printed: a notice board, a poster at the institute, the back of a handout, a slide in class. Phones open the test straight from the camera. The code includes a link too, so it also works when tapped on screen.</li>
</ul>
<p>All four use inline styles only, so they need no stylesheet, no script and no plugin, and they look the same on every website builder. Change the colour to match your site, change the button text to say what the test is (“Start Weekly Test 7” beats “Click here”), and paste.</p>
`),
                ],
            },
            {
                id: 'where-to-paste',
                title: 'Where to paste it: WordPress, Google Sites, Wix, Blogger and more',
                tocLabel: 'Where to paste it',
                kicker: 'Builder by builder',
                blocks: [
                    html(`
<p>Every website builder has a place for a block of HTML, and every one also has a button you can point at a link without touching code. Either works. The HTML gives you the card, the code box and the QR code; the builder’s own button matches your site’s style automatically.</p>
${buildersTable()}
<h3>WordPress</h3>
<p>In the block editor, press <strong>+</strong>, search for <strong>Custom HTML</strong>, add the block and paste the code. Preview shows it rendered. In Elementor, drag in the <strong>HTML</strong> widget instead. If you would rather not use code, the <strong>Buttons</strong> block with your test’s link does the same job and takes your theme’s colours. On a site with several people writing, note that WordPress lets only administrators and editors save raw HTML by default, so an author’s Custom HTML block may be cleaned up when they save.</p>
<h3>Google Sites</h3>
<p>The simplest route is <strong>Insert → Button</strong>: give it a name (“Start the test”) and paste your test’s link. For a card or a QR code, use <strong>Insert → Embed</strong>, choose the <strong>Embed code</strong> tab, paste, and click <strong>Next</strong> then <strong>Insert</strong>. Google Sites shows embedded code inside a box of its own, so resize the box until the card fits; the button inside it opens the test in a new tab.</p>
<h3>Wix</h3>
<p>Open <strong>Add Elements</strong>, choose <strong>Embed Code</strong>, then <strong>Embed HTML</strong>. In the element’s settings choose <strong>Code</strong>, paste, and click <strong>Update</strong>. Drag the element to size. Wix’s own <strong>Button</strong>, linked to your test, is the no-code alternative.</p>
<h3>Blogger</h3>
<p>For the sidebar of every page: <strong>Layout → Add a Gadget → HTML/JavaScript</strong>, paste, save. For one post: open the post, switch the editor from Compose view to <strong>HTML view</strong>, paste where the button should go, and switch back. A plain link on a sentence (“take this week’s test”) also works and suits Blogger’s look.</p>
<h3>Squarespace, Webflow and Shopify</h3>
<p>Squarespace has a <strong>Code</strong> block on plans that allow custom code, and a <strong>Button</strong> block on all of them. Webflow has a <strong>Code Embed</strong> element. On Shopify, add a <strong>Custom Liquid</strong> section in the theme editor and paste the code there.</p>
<h3>Notion, Google Classroom and learning platforms</h3>
<p>Some places only take links. In Notion, paste the test’s link and keep it as a link or a bookmark (an embed block would try to frame it). In Google Classroom, add the link as material or to an assignment. In Moodle, Canvas or another learning platform, add it as a URL resource set to open in a new window. Students tap, the test opens, and the result goes to your TestoZa dashboard.</p>
`),
                ],
            },
            {
                id: 'which-link',
                title: 'Which link to put on your website',
                tocLabel: 'Which link',
                kicker: 'Link or code',
                blocks: [
                    html(`
<p>A TestoZa test can reach candidates in two ways, and they belong on a website differently.</p>
<h3>A test link, for practice anyone can take any time</h3>
<p>A test set to <strong>Public</strong> has a link of its own, like <code>app.testoza.com/test/weekly-test-7-k3p9</code>. Anybody with the link can take it, whenever they like, and their result appears in your dashboard. This is the right link for a website: practice papers, previous years’ papers, a free sample test that shows parents what your institute’s tests look like. Copy it from <strong>My Tests</strong> with <strong>Share link</strong> in the test’s menu.</p>
<p>The link is created once, when the test is first saved, and it does not change when you edit the test. Fix a typo or swap a question and the button on your website keeps working; the next candidate simply sees the new version.</p>
<p>A test set to <strong>Private</strong> (“only you can see it”) has no share link. Make it public, or run it as a live exam.</p>
<h3>A live exam, for a paper everyone sits together</h3>
<p>A live exam is a sitting: a batch, a start time and a six-digit code. The code is new for each sitting and stops working when the exam ends, so a website is the wrong place for a particular code. Put the <strong>code box</strong> on your site instead — it always points at testoza.com/join — and give out each day’s code in class, on the projector or in the batch group.</p>
<p>That split works well in practice: your website carries the evergreen practice tests and a permanent “Exam today?” box; WhatsApp and the classroom carry the codes. There is more on that side in the guide to <a href="/share-test-on-whatsapp">sharing a test on WhatsApp</a>.</p>
`),
                ],
            },
            {
                id: 'side-by-side',
                title: 'An iframe and a button, side by side',
                tocLabel: 'Side by side',
                kicker: 'Side by side',
                blocks: [
                    html(`
<p>If you are choosing a tool and its sales page promises an iframe embed, these are the questions worth asking about it:</p>
`),
                    { type: 'widget', widget: 'hw-compare', fallbackHtml: compareFallback(P) },
                ],
            },
            {
                id: 'make-it-work',
                title: 'Making the button work: words, placement and design',
                tocLabel: 'Words and design',
                kicker: 'The details',
                blocks: [
                    html(`
<p>A button nobody taps is decoration. Most of what makes a visitor start a test is in the two lines around it, not in the colour.</p>
<h3>Say what the test is</h3>
<p>Before the button, answer the four questions a student or parent has: <strong>what is it</strong> (“Weekly Test 7, Kinematics”), <strong>how long</strong> (“30 questions, 45 minutes”), <strong>does it count</strong> (“+4 for a correct answer, −1 for a wrong one, just like JEE Main”), and <strong>do I need to sign up</strong> (“No account and no app: tap and type your name”). The card style puts the first two in automatically; write the other two in your own words.</p>
<h3>Say what happens next</h3>
<p>“Opens in a new tab” under the button removes the small worry of losing their place on your site. On a page of several tests, say which one to take first.</p>
<h3>Put it where the reading ends</h3>
<p>The best place for a test button is the end of the thing it tests: the bottom of a chapter’s notes, the end of a lesson video’s description, after the last solved example. A visitor who has just read the material is the visitor most likely to take the test, and the test tells them whether the reading worked.</p>
<h3>Make it easy to tap</h3>
<p>Buttons from the generator are about 48 pixels tall: Android’s guidelines ask for at least 48 and Apple’s for at least 44 points, for a comfortable tap on a phone. Keep space around them, don’t put two test buttons side by side on a narrow screen, and test the page on a phone before you publish it.</p>
<h3>Build a “Tests” page</h3>
<p>If your site has more than a couple of tests, give them a page of their own: one card per test, newest first, with the code box at the top for live exams. Link to it from your menu. It becomes the place students go on their own, which is the whole point of putting tests on a website.</p>
`),
                ],
            },
            {
                id: 'ten-minutes',
                title: 'Your test on your site in about ten minutes',
                tocLabel: 'Ten minutes',
                kicker: 'Step by step',
                blocks: [
                    html(`
<p>The whole job, for a test that already exists:</p>
`),
                    { type: 'widget', widget: 'hw-steps', fallbackHtml: stepsFallback(P) },
                ],
            },
            {
                id: 'results',
                title: 'Where the results go',
                tocLabel: 'Where results go',
                kicker: 'After the test',
                blocks: [
                    html(`
<p>The test opens from your website, but it runs on TestoZa, and so do the results. Everything a candidate submits lands in your TestoZa dashboard, whichever page they started from:</p>
<ul class="al-checks">
<li><strong>Every attempt,</strong> with the score, the time taken and the answers, as soon as it is submitted.</li>
<li><strong>A rank list and per-question numbers:</strong> how many attempted each question, how many got it right, how long they spent, and which wrong option was most popular.</li>
<li><strong>Excel downloads</strong> for your own records, and report cards to print.</li>
<li><strong>The candidate’s own result</strong> on screen when they submit (or later, depending on how you release results), with the answer key.</li>
</ul>
<p>What does <em>not</em> happen is any of that flowing back into your website. There is no plug-in that shows scores on your WordPress site, no API to pull results into another system and no webhook that fires when a test is submitted. If your website needs to show results — a leaderboard on your homepage, say — the route is to download them and publish what you choose, by hand.</p>
`),
                ],
            },
            {
                id: 'limits',
                title: 'What this can’t do',
                tocLabel: 'Honest limits',
                kicker: 'Being straight',
                blocks: [
                    html(`
<p>So nobody is surprised after building a page around it:</p>
<ul class="al-limits">
<li><strong>No iframe embed.</strong> The test always opens in its own tab. Covered above, and deliberate.</li>
<li><strong>No results on your website.</strong> No plug-in, API or webhook; results live in your TestoZa dashboard and download as Excel.</li>
<li><strong>No single sign-on with your site.</strong> If your website has its own student logins, they don’t carry over. Candidates type their name, roll number or the day’s code instead, which on a phone is usually faster anyway.</li>
<li><strong>The address bar says TestoZa.</strong> The test runs on app.testoza.com, not on your domain. Your institute’s name can appear on the test and in the invitation, but the address is ours.</li>
<li><strong>A public link is public.</strong> Anyone with the link can take a public test, which is right for practice and wrong for a paper that decides something. For those, use a live exam with a batch list, where only the names or roll numbers on your list get in.</li>
</ul>
<p>Inside those limits, a button on your website is the lightest way to turn a site that students visit into a place where they also practise — and it costs nothing to try with one test.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'Can I embed a TestoZa test in an iframe on my website?',
                a: 'No. TestoZa’s pages send X-Frame-Options: SAMEORIGIN and frame-ancestors \'self\', so browsers refuse to show them inside another website’s frame; you would see an empty box or a “refused to connect” message. Use a button, card, code box or QR code that opens the test in a new tab instead. It is also the better experience for an exam: the whole screen, working full-screen and tab-switch rules, and answers saved in one place.',
            },
            {
                q: 'How do I add an online test to my WordPress site?',
                a: 'Copy the HTML from the generator on this page, then in the WordPress block editor add a Custom HTML block and paste it (in Elementor, use the HTML widget). Without code, add a Buttons block and set its link to your test. Both open the test in a new tab. No plugin is needed.',
            },
            {
                q: 'How do I put a test on Google Sites?',
                a: 'The simplest way is Insert → Button: name it “Start the test” and paste your test’s link. For a card with the test’s details or a QR code, use Insert → Embed, choose the Embed code tab, paste the HTML from the generator, then click Next and Insert, and resize the box to fit.',
            },
            {
                q: 'How do I add a test to Wix or Blogger?',
                a: 'In Wix, go to Add Elements → Embed Code → Embed HTML, choose Code and paste the HTML, or use a Wix Button linked to your test. In Blogger, use Layout → Add a Gadget → HTML/JavaScript for every page, or switch a post to HTML view and paste the code where the button should go.',
            },
            {
                q: 'Do visitors need an account to take the test from my website?',
                a: 'No, unless you switch on “candidates must sign in” for that test. They tap the button, type their name and start. For a live exam they type the six-digit code and their name or roll number at testoza.com/join.',
            },
            {
                q: 'Which link should I put on my website: a test link or a join code?',
                a: 'A test link for practice anyone can take at any time — set the test to Public and copy it with Share link. For live exams, whose six-digit code changes every sitting, put a code box on your site that opens testoza.com/join, and give out each day’s code in class or in the batch group.',
            },
            {
                q: 'If I edit the test, do I need to update my website?',
                a: 'No. A test’s link is created when it is first saved and stays the same when you edit it, so the button keeps working and the next candidate sees the new version.',
            },
            {
                q: 'Can I show test results on my website?',
                a: 'Not automatically. Results go to your TestoZa dashboard, where you can see the rank list and per-question numbers, print report cards and download everything as Excel. There is no plug-in, API or webhook that sends results to another website; publish what you want from the download.',
            },
            {
                q: 'Is the embed code free?',
                a: 'Yes. The generator, the code and the test link cost nothing, and building and running tests on TestoZa is free. Paid plans (₹49 for 7 days, ₹149 for 30 days, ₹799 for a year) add exam rules such as forced full screen and tab-switch limits, and other extras.',
            },
        ],

        closingTitle: 'Put one test on your site today',
        closing: [
            html(`
<p>One button, under the notes your students already read. That is the whole experiment:</p>
<div class="al-paths">
<a class="al-path" href="/my-tests" data-icon="key"><span class="al-path-who">Test already made?</span><span class="al-path-what">Copy its link from My Tests and use the generator above</span></a>
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Paper on your computer?</span><span class="al-path-what">Upload the PDF and let the AI turn it into a test</span></a>
<a class="al-path" href="/create-test" data-icon="pencil"><span class="al-path-who">Starting from scratch?</span><span class="al-path-what">Build a test, set it to Public, share the link</span></a>
</div>
<p>Related reading: <a href="/share-test-on-whatsapp">sharing a test on WhatsApp</a>, <a href="/mobile-friendly-online-exam">mobile-friendly online exams</a>, <a href="/how-to-conduct-online-exam">how to conduct an online exam</a> and <a href="/pricing">pricing</a>.</p>
`),
        ],

        sources: [
            {
                label: 'How browsers treat frames',
                links: [
                    { label: 'X-Frame-Options (MDN)', href: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options' },
                    { label: 'CSP frame-ancestors (MDN)', href: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors' },
                    { label: 'Storage partitioning (MDN)', href: 'https://developer.mozilla.org/en-US/docs/Web/Privacy/State_Partitioning' },
                    { label: 'iframe allow attribute (MDN)', href: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#allow' },
                ],
            },
            {
                label: 'Website builders',
                links: [
                    { label: 'WordPress documentation', href: 'https://wordpress.org/documentation/' },
                    { label: 'Google Sites Help', href: 'https://support.google.com/sites' },
                    { label: 'Wix Help Center', href: 'https://support.wix.com/en' },
                    { label: 'Blogger Help', href: 'https://support.google.com/blogger' },
                ],
            },
            {
                label: 'Tap targets',
                links: [
                    { label: 'Apple: accessibility guidelines', href: 'https://developer.apple.com/design/human-interface-guidelines/accessibility' },
                    { label: 'Android: touch target size', href: 'https://support.google.com/accessibility/android/answer/7101858' },
                ],
            },
        ],
    },
};
