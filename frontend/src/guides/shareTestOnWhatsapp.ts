/**
 * testoza.com/share-test-on-whatsapp — how to send a test to a batch on WhatsApp so the
 * whole group opens it, and how to send results back. Written for teachers and coaching
 * institutes whose batches live in WhatsApp groups.
 *
 * Every message on this page is the product's own text (utils/shareUtils.ts
 * testInviteText; components/exams/share.ts inviteText, rankListText, parentText,
 * absentParentText), for a made-up batch; see WA_MESSAGES in howtoData.ts. Preview cards
 * are what the worker writes for /test/ and /join/ links (worker.js generateMetaTags).
 * Not in the product, and never to be implied: sending WhatsApp messages automatically,
 * the WhatsApp Business API, a WhatsApp bot, Hindi message templates, read tracking.
 */
import { HOWTO_PAGES } from './howtoData';
import { compareFallback, messagesFallback, scenariosFallback, stepsFallback } from './howtoFallback';
import { WHATSAPP_META } from './meta';
import type { Guide } from './types';

const html = (markup: string) => ({ type: 'html' as const, html: markup.trim() });

const P = HOWTO_PAGES.whatsapp;

export const SHARE_TEST_ON_WHATSAPP: Guide = {
    meta: WHATSAPP_META,
    body: {
        intro: [
            html(`
<p>For most Indian batches, the classroom has a second room: the WhatsApp group. Notes go there, holidays are announced there, doubts get asked there at eleven at night. So that is where the test goes too.</p>
<p>And that is where a lot of tests quietly fail. Not because the questions were wrong or the software broke, but because of the message: a bare link nobody could identify, two links with “if the first doesn’t work”, no word on whether students needed to sign up, a preview card advertising something else entirely, sent at an hour when it was buried under forty other messages by morning. Half the batch never opened it, and the teacher concluded that online tests don’t work for their students.</p>
<p>This guide is about getting that last step right: choosing between a test link and a live exam code, what a message students act on actually says, how to send it from a phone or a computer, what happens when a student forwards it or opens it late, and how to send the results back to the same group — and to each parent — the same evening.</p>
`),
        ],

        answer:
            'To share a test on WhatsApp, send one message that names the test in bold, gives the number of questions and the time, has exactly one link, and says whether students need an account — then send it to the batch group the evening before and again shortly before the start. For practice anyone can take any time, share the test’s link (in TestoZa: Share link on My Tests, which opens the share sheet on a phone or copies the whole message on a computer). For a paper the whole batch sits together, create a live exam and press its WhatsApp button: the message gives testoza.com/join, a six-digit code and how to check in, and needs no app or account. Afterwards, TestoZa writes the rank list and a note for each parent as WhatsApp messages; you press send. Nothing is sent without you.',

        sections: [
            {
                id: 'the-group',
                title: 'Your batch lives in a WhatsApp group',
                tocLabel: 'Where batches live',
                kicker: 'Start here',
                blocks: [
                    html(`
<p>A test link has to compete in the same feed as forwarded good-morning images, someone’s doubt about question 14 and three voice notes. In that feed, a message gets a glance — about three seconds — before it is opened or scrolled past. Everything below is about winning those three seconds, and then about making sure that nothing stops a student between the tap and question 1.</p>
<h3>The five ways a test message fails</h3>
<ol class="al-list al-list--num">
<li><strong>It doesn’t say what it is.</strong> A long address on its own tells nobody which test this is, how long it takes or whether it counts.</li>
<li><strong>It has two links.</strong> “If the first link doesn’t work, try this one” tells the batch the first one is unreliable, so half of them pick the second, which often leads somewhere else.</li>
<li><strong>It doesn’t answer “do I need to sign up?”</strong> So a third of the batch asks in the group, and the group fills with the same question.</li>
<li><strong>The preview card is wrong.</strong> WhatsApp draws a card from the page a link opens. If that page doesn’t describe the test, the card shows a generic title and image, and looks like an advert.</li>
<li><strong>It arrives at the wrong time.</strong> Sent at 7 a.m. for a 10 a.m. test, it is under forty messages by 9:55.</li>
</ol>
<p>Each of these has a simple fix, and TestoZa builds most of them into the message it writes for you. The rest is timing, which is yours.</p>
`),
                ],
            },
            {
                id: 'link-or-code',
                title: 'A test link or a live exam code: which to send',
                tocLabel: 'Link or code',
                kicker: 'The first choice',
                blocks: [
                    html(`
<p>TestoZa gives you two ways to put a test in front of a batch, and they suit different jobs.</p>
<div class="al-table-wrap"><table class="al-table">
<thead><tr><th scope="col"></th><th scope="col">A test link</th><th scope="col">A live exam with a code</th></tr></thead>
<tbody>
<tr><th scope="row">What it is for</th><td data-label="Test link">Practice anyone can take, whenever they like</td><td data-label="Live exam">A paper everyone sits together, at one time</td></tr>
<tr><th scope="row">What students get</th><td data-label="Test link">A link to tap</td><td data-label="Live exam">testoza.com/join and a six-digit code, plus a direct link</td></tr>
<tr><th scope="row">Who can open it</th><td data-label="Test link">Anyone with the link, if the test is Public</td><td data-label="Live exam">Only names or roll numbers on your batch list, if you attach one</td></tr>
<tr><th scope="row">When it starts</th><td data-label="Test link">When each student taps</td><td data-label="Live exam">When you press Start, or at the time you set; students wait in a lobby</td></tr>
<tr><th scope="row">What you see</th><td data-label="Test link">Results as they are submitted</td><td data-label="Live exam">A live room: who is in, writing, submitted, or flagged</td></tr>
<tr><th scope="row">Use it for</th><td data-label="Test link">Homework tests, previous years’ papers, revision</td><td data-label="Live exam">Weekly tests that count, mocks, anything with a rank list</td></tr>
</tbody>
</table></div>
<p>A rule that works: if it would be unfair for one student to see the paper before another, use a live exam. Otherwise, a link.</p>
<p>A test set to <strong>Private</strong> has no share link. Make it Public to share it as a link, or run it as a live exam.</p>
`),
                ],
            },
            {
                id: 'the-messages',
                title: 'The messages, word for word',
                tocLabel: 'The messages',
                kicker: 'What students see',
                blocks: [
                    html(`
<p>These are the four messages TestoZa writes, exactly as they arrive in a WhatsApp group, for a made-up batch. Switch between them to see each one and where it comes from in the product:</p>
`),
                    { type: 'widget', widget: 'hw-whatsapp', fallbackHtml: messagesFallback() },
                    html(`
<h3>Why the invitation is written the way it is</h3>
<ul class="al-checks">
<li><strong>The test’s name in bold, first.</strong> WhatsApp shows text between asterisks in bold, so <code>*Weekly Test 7*</code> is the first thing an eye lands on in a busy group.</li>
<li><strong>The facts on one line.</strong> Questions and minutes for a link; batch, day and time and minutes for a live exam. Enough to decide “now or after dinner” without opening anything.</li>
<li><strong>One link, on one address.</strong> Never a backup link. The link is always on the same host, whichever page you shared it from, so it never changes between the card on your screen and the message in the group.</li>
<li><strong>The account question, answered.</strong> “No app and no account needed — just type your name.” If you switched on sign-in for that test, the message says to sign in instead: the message only promises what is true.</li>
<li><strong>For a live exam, numbered steps.</strong> Open testoza.com/join, enter the code, check in. The code is in bold with a space in the middle (<code>482 913</code>), because six digits in a row are easy to mistype and three plus three are not.</li>
<li><strong>A direct link as well.</strong> Tapping it fills in the code. Typing the code is the fallback that never breaks.</li>
<li><strong>Your institute’s name, not ours.</strong> If your tests carry your institute’s name, the message uses it. Only a test without one says “Conducted on TestoZa”.</li>
</ul>
<p>You can edit any of it in WhatsApp before you press send — add the three rules for exam day, a word in Hindi, a reminder about the syllabus. Keep the link and the code as they are.</p>
`),
                ],
            },
            {
                id: 'how-to-send',
                title: 'How to send it, from a phone or a computer',
                tocLabel: 'How to send it',
                kicker: 'Step by step',
                blocks: [
                    html(`
<p>From a saved test to the rank list in the group, the whole evening looks like this:</p>
`),
                    { type: 'widget', widget: 'hw-steps', fallbackHtml: stepsFallback(P) },
                    html(`
<h3>A test link, from your phone</h3>
<p>Open <strong>My Tests</strong>, tap the test’s menu and choose <strong>Share link</strong>. Your phone’s share sheet opens with the whole message ready. Choose WhatsApp, pick the batch group, and send.</p>
<h3>A test link, from a computer</h3>
<p>Computers usually have no share sheet, so <strong>Share link</strong> copies the whole message — not just the link — and says “Message copied” on screen. Open WhatsApp Web or the desktop app, click into the group and paste. Pasting the message rather than a bare link is what gives students the instructions along with it.</p>
<h3>A live exam</h3>
<p>Create the exam for the batch. The screen that follows shows the code large, a QR code, and three buttons: <strong>WhatsApp</strong>, which opens WhatsApp with the invitation already written; <strong>Copy</strong>, for pasting it yourself; and a projector view for the classroom. The same buttons are in the exam room, so you can send a reminder 15 minutes before the start from the same place.</p>
<h3>Sending to one student</h3>
<p>The same message works in a private chat. For a student who missed the group message, forward it rather than writing a new one, so they get the same link and code as everyone else.</p>
`),
                ],
            },
            {
                id: 'preview',
                title: 'The preview card, and how to make it say the right thing',
                tocLabel: 'The preview card',
                kicker: 'The card',
                blocks: [
                    html(`
<p>When a message contains a link, WhatsApp fetches the page behind it and draws a small card: a title, a line of description and an image. Students read that card before they read your text, and parents certainly do.</p>
<p>For a TestoZa test link, the card’s title is the test’s name and its description is the test’s own description followed by the number of questions — “(30 questions, instant results &amp; solutions on TestoZa)”. For a live exam link, the card names the test and your institute and says: “Enter code 482 913 and type your name to start (30 questions, 45 minutes). No app and no account needed.” Join links are kept out of search engines, because they are private invitations.</p>
<h3>Three things you control</h3>
<ul class="al-list">
<li><strong>The test’s name.</strong> “Weekly Test 7: Kinematics” is a card. “Test 1 (copy)” is a mystery. Name tests for the student reading the card.</li>
<li><strong>The test’s description.</strong> One plain sentence on what it covers — “Motion in a straight line and projectiles” — becomes the card’s second line.</li>
<li><strong>Your institute’s name.</strong> Add it to the test and it appears on the live exam card and in the invitation.</li>
</ul>
<p>The card is a convenience, not a requirement. The message works without it, because the message itself already says what the test is.</p>
`),
                ],
            },
            {
                id: 'side-by-side',
                title: 'A bare link and a proper invitation, side by side',
                tocLabel: 'Side by side',
                kicker: 'Side by side',
                blocks: [
                    html(`
<p>The difference between a test half the batch opens and one the whole batch opens is mostly in five details:</p>
`),
                    { type: 'widget', widget: 'hw-compare', fallbackHtml: compareFallback(P) },
                ],
            },
            {
                id: 'what-happens',
                title: 'What happens when a message escapes the plan',
                tocLabel: 'When things happen',
                kicker: 'Questions in the group',
                blocks: [
                    html(`
<p>Once a message is in a group, it takes on a life of its own. These are the situations teachers ask about most, with what TestoZa does about each:</p>
`),
                    { type: 'widget', widget: 'hw-scenarios', fallbackHtml: scenariosFallback(P) },
                    html(`
<p>A public test link behaves differently from a live exam on the first of these: anyone with the link can take a public test, wherever the link travels. That is fine for practice — a forwarded practice test is free marketing for your institute — and the reason a paper that counts should be a live exam with a batch list.</p>
`),
                ],
            },
            {
                id: 'results',
                title: 'Sending results back on WhatsApp',
                tocLabel: 'Results on WhatsApp',
                kicker: 'After the test',
                blocks: [
                    html(`
<p>The fastest way to make the next test matter to a batch is to send this one’s result the same evening. In the results of a live exam there are three WhatsApp actions.</p>
<h3>The rank list, to the group</h3>
<p><strong>Send rank list on WhatsApp</strong> opens WhatsApp with the whole list written: the test, the number of candidates and the class average, medals for the top three, everyone else numbered with their marks and percentage, and the names of those who were absent. Pick the batch group and send.</p>
<h3>A note to each parent</h3>
<p>If your batch list has parents’ phone numbers, each candidate’s row has a <strong>Parent</strong> button (on a tablet or computer screen; it is hidden on a narrow phone). It opens a chat with that parent — Indian numbers saved without the country code get +91 added — with a short note already written: the student’s marks and percentage, their rank out of the batch, the class average, and section marks if the paper had sections, signed with your institute’s name. One tap per parent. For a batch of 40 that is a few minutes, and they are the messages parents remember.</p>
<h3>A note for the absent</h3>
<p>Candidates who didn’t sit the exam are listed separately. Where the parent’s number is on the list, <strong>Tell parent</strong> opens a note saying the student was absent and asking the parent to get in touch about a re-test.</p>
<h3>Students looking up their own result</h3>
<p>Candidates from a live exam can look up their own result later with the code and their details, once you have released results — when the exam ends, as each paper is submitted, or by hand after you have checked. So “where is my result?” in the group has a one-line answer.</p>
<p class="al-note">Before sending a full rank list to a group of minors, decide whether the whole batch should see everyone’s marks. Many institutes send the top ten to the group and each student’s own result to their parent privately. The parent notes make that easy.</p>
`),
                ],
            },
            {
                id: 'timing',
                title: 'Timing, groups and good manners',
                tocLabel: 'Timing and groups',
                kicker: 'Small things that matter',
                blocks: [
                    html(`
<ul class="al-list">
<li><strong>Send it twice.</strong> The evening before, so students can plan, and 15 minutes before the start, so it is at the bottom of the chat when they open it.</li>
<li><strong>Pin it.</strong> If you are a group admin, pin the invitation so it stays at the top until the exam ends.</li>
<li><strong>Quiet the group during the exam.</strong> Group admins can set the group so only admins can send messages. During a test, that stops “what’s the answer to 12?” from appearing in front of everyone, and you can switch it back afterwards.</li>
<li><strong>Add the exam-day rules.</strong> For phone exams: charge the phone, turn on Do Not Disturb, don’t close the tab, and rejoin on another device if the phone dies. One line each, under the invitation.</li>
<li><strong>Use an announcement group for big batches.</strong> If your institute runs a WhatsApp community with an announcement group, post the invitation there, once, rather than in several batch groups.</li>
<li><strong>Parents’ numbers are personal data.</strong> Keep the batch list to the people who need it, and send parent notes privately, never to a group.</li>
</ul>
`),
                ],
            },
            {
                id: 'limits',
                title: 'What TestoZa doesn’t do on WhatsApp',
                tocLabel: 'Honest limits',
                kicker: 'Being straight',
                blocks: [
                    html(`
<ul class="al-limits">
<li><strong>Nothing is sent automatically.</strong> TestoZa writes the message and opens WhatsApp; you choose the chat and press send. There is no scheduled sending and no bulk sending.</li>
<li><strong>No WhatsApp Business API and no bot.</strong> Messages go from your own WhatsApp, as yours. Students can’t take a test inside WhatsApp; they tap through to the browser.</li>
<li><strong>Messages are written in English.</strong> Edit them in WhatsApp before sending if your batch prefers Hindi; keep the link and the code as they are.</li>
<li><strong>No read receipts in TestoZa.</strong> WhatsApp shows you who has read a message; TestoZa shows you who has joined and who has submitted, which is the number that matters.</li>
<li><strong>Parent notes need parents’ numbers.</strong> They come from your batch list (paste them from Excel or WhatsApp with the roll numbers and names); a student without one has no Parent button. The Parent buttons also need a screen wider than a phone’s, so send parent notes from a tablet or computer.</li>
</ul>
<p>None of these get in the way of the main job: one message that a whole batch can act on, and results back in the same group the same evening.</p>
`),
                ],
            },
        ],

        faqs: [
            {
                q: 'How do I share an online test on WhatsApp?',
                a: 'In TestoZa, open My Tests, choose Share link in the test’s menu and pick WhatsApp from your phone’s share sheet; on a computer, Share link copies the whole message to paste into WhatsApp Web. For a live exam, press the WhatsApp button on the exam: it opens WhatsApp with the invitation, the six-digit code and a direct link already written.',
            },
            {
                q: 'Do students need to install an app or create an account?',
                a: 'No. Students tap the link and type their name, or for a live exam open testoza.com/join, type the code and their name or roll number. An account is only needed if you switch on “candidates must sign in” for a test, and the message then says so.',
            },
            {
                q: 'Should I send a test link or a join code?',
                a: 'A test link for practice anyone can take at any time. A live exam with a code for a paper everyone sits together, when it would be unfair for one student to see it before another: students wait in a lobby, start together, and with a batch list attached only names or roll numbers on the list can join.',
            },
            {
                q: 'What if a student forwards the test link outside the batch?',
                a: 'A public test link can be taken by anyone who has it, which is fine for practice. A live exam with a batch list turns away names or roll numbers that aren’t on the list (unless you allow walk-ins), and with roll number and PIN a candidate also needs the PIN from their own printed slip.',
            },
            {
                q: 'Why does my WhatsApp link preview show the wrong title?',
                a: 'WhatsApp builds the preview card from the page the link opens. For a TestoZa test link the card uses the test’s name and description, so give the test a clear name and a one-sentence description. For a live exam link the card names the test and your institute and says to enter the code. Old messages keep the card WhatsApp drew when they were sent.',
            },
            {
                q: 'Can I send results to parents on WhatsApp?',
                a: 'Yes. If your batch list includes parents’ phone numbers, each candidate in the results of a live exam has a Parent button (on a tablet or computer screen) that opens a chat with their parent and a note already written: marks, percentage, rank, class average and section marks. Absent candidates have a Tell parent button too. You press send for each one; nothing goes out automatically.',
            },
            {
                q: 'Can I send the rank list to the WhatsApp group?',
                a: 'Yes. Send rank list on WhatsApp writes the whole list — the test, the number of candidates and the average, medals for the top three, everyone else numbered with marks and percentage, and who was absent — and opens WhatsApp for you to pick the group. Consider sending only the top ten to a group and each result privately to parents.',
            },
            {
                q: 'Can TestoZa send WhatsApp messages automatically?',
                a: 'No. There is no WhatsApp Business API connection, no bot and no scheduled sending. TestoZa writes each message and opens WhatsApp; you choose the chat and press send, from your own number.',
            },
            {
                q: 'Is it free to share tests on WhatsApp?',
                a: 'Yes. Sharing links, live exams with join codes, the rank list and parent notes are all free, as are building tests and marking. Paid plans (₹49 for 7 days, ₹149 for 30 days, ₹799 for a year) add exam rules such as forced full screen and tab-switch limits, and other extras.',
            },
        ],

        closingTitle: 'Send this week’s test the right way',
        closing: [
            html(`
<p>One message, one link, sent at the right time — and the results back the same evening:</p>
<div class="al-paths">
<a class="al-path" href="/my-tests" data-icon="key"><span class="al-path-who">Test already made?</span><span class="al-path-what">Open My Tests and choose Share link</span></a>
<a class="al-path" href="/generate-with-ai" data-icon="doc"><span class="al-path-who">Paper on your phone?</span><span class="al-path-what">Upload the PDF or photos and make it a test</span></a>
<a class="al-path" href="/user-guide/live-exam-sessions" data-icon="pencil"><span class="al-path-who">A paper the batch sits together?</span><span class="al-path-what">See how join codes and the exam room work</span></a>
</div>
<p>Related reading: <a href="/mobile-friendly-online-exam">exams on phones</a>, <a href="/embed-test-on-website">putting a test on your website</a>, <a href="/how-to-conduct-online-exam">how to conduct an online exam</a> and <a href="/pricing">pricing</a>.</p>
`),
        ],

        sources: [
            {
                label: 'WhatsApp',
                links: [
                    { label: 'WhatsApp Help Center', href: 'https://faq.whatsapp.com/' },
                ],
            },
            {
                label: 'TestoZa',
                links: [
                    { label: 'Join an exam', href: 'https://testoza.com/join' },
                    { label: 'Live exam sessions', href: 'https://testoza.com/user-guide/live-exam-sessions' },
                    { label: 'Pricing', href: 'https://testoza.com/pricing' },
                ],
            },
        ],
    },
};
