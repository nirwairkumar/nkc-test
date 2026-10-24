/**
 * Four "how to" guides share one page shell, six small widgets and this file:
 *
 *   /mobile-friendly-online-exam      /embed-test-on-website
 *   /full-length-online-test-maker    /share-test-on-whatsapp
 *
 * plus /best-online-exam-software-india (25 October 2026), a comparison page that reuses
 * the shell and two of the widgets (hw-scenarios, hw-compare) as they are; its `steps`
 * are shown as a plain numbered list (stepsFallback), which fits a phone better.
 *
 * One HowtoPage here is one page. The React widgets (pages/guides/howto/HowToWidgets.tsx)
 * and the crawler text (the fallbackHtml in each guide file) are both built from it,
 * so what a reader clicks and what Google reads can never drift apart.
 *
 * Plain, dependency-free TypeScript, like the rest of src/guides: the Cloudflare worker
 * imports it too. No React, no '@/…' imports, no browser APIs. Icons are named here as
 * strings and mapped to Lucide components in pages/guides/howto/HwIcon.tsx.
 *
 * Product facts were checked against the code on 13 October 2026:
 *   - live exams (join codes): answers kept on the device and sent with a heartbeat every
 *     20 s (TestPage.tsx); the deadline is the server's (services/exam_sessions.py
 *     participant_deadline: own start + duration, capped by closes_at); late entry
 *     defaults to 15 min (NewExamSheet.tsx); a seat is open on one device at a time
 *     ("Changed device"); with a batch list, names/rolls not on it are refused unless
 *     walk-ins are allowed, and roll + PIN needs the slip (routers/join.py); papers submit
 *     themselves ~2.5 s after time-up.
 *   - phones: palette in a "Questions" sheet from the right edge (lg:hidden), question text
 *     18px with a text-size control, Back / Save & Next along the bottom; full screen is
 *     skipped where the browser can't do it (iPhone Safari); app switches are counted only
 *     when tab-switch rules are on; Screen Wake Lock is requested on live exams.
 *   - framing: every testoza.com host answers with X-Frame-Options: SAMEORIGIN and
 *     frame-ancestors 'self' (checked live with curl), so no other site can frame a test.
 *   - share text: utils/shareUtils.ts testInviteText and components/exams/share.ts
 *     inviteText / rankListText / parentText. The WhatsApp messages below mirror them.
 */

export type HowtoKey = 'mobile' | 'embed' | 'fullLength' | 'whatsapp' | 'bestIndia';

/** A row in a grouped list (hero card, widget lists). */
export interface HwRow {
    icon: string;
    label: string;
}

/** One theme of the side-by-side widget. */
export interface HwTheme {
    id: string;
    label: string;
    question: string;
    them: string[];
    us: string[];
    takeaway: string;
}

/** One situation in the "what happens when" widget. */
export interface HwScenario {
    id: string;
    /** Chip label: short enough for a phone. */
    label: string;
    icon: string;
    /** Heading inside the card. */
    title: string;
    /** Same order as `HowtoScenarios.columns`. */
    lines: string[];
}

/** A step of the checklist widget. */
export interface HwStep {
    id: string;
    title: string;
    detail: string;
    minutes: number;
}

export interface HowtoCompare {
    title: string;
    themLabel: string;
    usLabel: string;
    themes: HwTheme[];
    caption: string;
}

export interface HowtoScenarios {
    title: string;
    sub: string;
    /** Labels for the lines of every scenario, e.g. On their phone / In your exam room / Tell the batch. */
    columns: [string, string, string];
    items: HwScenario[];
    caption: string;
}

export interface HowtoSteps {
    title: string;
    sub: string;
    items: HwStep[];
    caption: string;
    doneText: string;
}

export interface HowtoPage {
    key: HowtoKey;
    /** The hero card: the page's argument as grouped lists. */
    hero: {
        title: string;
        tag: string;
        groups: { label: string; icon: string; us?: boolean; rows: HwRow[] }[];
        foot: string;
    };
    /** Four numbers under the headline. `small` is set in a smaller type beside the number. */
    stats: { dt: string; dd: string; small?: string }[];
    /** Line under the byline. */
    checked: string;
    compare: HowtoCompare;
    scenarios?: HowtoScenarios;
    steps: HowtoSteps;
}

// ── /mobile-friendly-online-exam ────────────────────────────────────────────

const MOBILE: HowtoPage = {
    key: 'mobile',
    hero: {
        title: 'What a phone exam has to survive',
        tag: 'Phones',
        groups: [
            {
                label: 'What a batch of forty phones brings',
                icon: 'alert-triangle',
                rows: [
                    { icon: 'phone-call', label: 'A call in the middle of question 23' },
                    { icon: 'wifi-off', label: 'No signal for three minutes' },
                    { icon: 'battery-low', label: 'Battery at 4% when the exam starts' },
                    { icon: 'smartphone', label: 'An iPhone that can’t go full screen' },
                ],
            },
            {
                label: 'What the exam does about it',
                icon: 'sparkles',
                us: true,
                rows: [
                    { icon: 'cloud', label: 'Answers kept on the phone, saved every 20 seconds' },
                    { icon: 'refresh-cw', label: 'Rejoin on another phone with the same answers' },
                    { icon: 'timer', label: 'The paper submits itself when time is up' },
                    { icon: 'key-round', label: 'No app and no account: a six-digit code' },
                ],
            },
        ],
        foot: 'Every row on the left happens in a real batch. A mobile exam has to expect it.',
    },
    stats: [
        { dt: 'Apps to install', dd: '0' },
        { dt: 'Saved to the server every', dd: '20', small: 'sec' },
        { dt: 'Accounts to create', dd: '0' },
        { dt: 'Starting text size', dd: '18', small: 'px' },
    ],
    checked: 'Phone behaviour checked against the live exam screen on 13 October 2026',
    compare: {
        title: 'Desktop-first exam software and a phone-first exam',
        themLabel: 'Desktop-first',
        usLabel: 'TestoZa on a phone',
        themes: [
            {
                id: 'start',
                label: 'Getting in',
                question: 'What does a candidate need before question 1?',
                them: [
                    'Often a desktop app or a lockdown browser. The widely used ones have no Android version, and most Indian students carry Android phones.',
                    'An account the institute created, with a password somebody will have forgotten on the morning of the exam.',
                ],
                us: [
                    'A browser. They open testoza.com/join, type the six-digit code and their name or roll number.',
                    'Nothing to install on Android or iPhone, and no password to forget.',
                ],
                takeaway: 'Every step before the first question loses a few candidates. On a phone, the installer often does not exist at all.',
            },
            {
                id: 'screen',
                label: 'The screen',
                question: 'What does a question look like on a six-inch screen?',
                them: [
                    'Often a desktop layout shrunk to fit: a palette taking a third of the width, small buttons, text that needs pinching.',
                    'Equations and diagrams pasted as pictures, which blur when zoomed.',
                ],
                us: [
                    'One question at a time at 18px, with a text-size control for long passages.',
                    'The palette waits behind a Questions button at the edge of the screen and slides in when tapped.',
                    'Back and Save & Next along the bottom, where a thumb already is. Equations are typeset, not pictures.',
                ],
                takeaway: 'If a student has to pinch to read option C, the mock is testing their eyesight, not their physics.',
            },
            {
                id: 'network',
                label: 'The network',
                question: 'What happens when the signal drops?',
                them: [
                    'Some systems need a steady connection and freeze, or sign the candidate out, when it goes.',
                    'Answers given while offline may be lost when the page reloads.',
                ],
                us: [
                    'A red dot in the top bar says “No internet — answers saved locally”, and the candidate keeps answering.',
                    'Answers go up with the next save once the signal is back; on a live exam that is every 20 seconds.',
                ],
                takeaway: 'Patchy mobile data is the normal case, not the exception. Design for the bus stop, not the computer lab.',
            },
            {
                id: 'device',
                label: 'A dead phone',
                question: 'What if the phone dies at minute 40?',
                them: [
                    'The attempt is often stuck “in progress” until an administrator finds it and resets it.',
                    'The candidate starts again, or loses the paper.',
                ],
                us: [
                    'They join again on any phone, tablet or laptop with the same details and carry on from their saved answers, with the time that is left.',
                    'The first device is signed out and their row in your exam room says “Changed device”, so a swap is visible.',
                ],
                takeaway: 'A dead phone should cost a candidate twenty seconds of work, not the exam.',
            },
            {
                id: 'rules',
                label: 'Exam rules',
                question: 'Do anti-cheating rules work on a phone?',
                them: [
                    'Rules usually depend on a locked-down desktop. On a phone they are either missing or quietly not enforced.',
                ],
                us: [
                    'Leaving the exam screen is noticed by the phone’s browser and counted against a limit you set, which can submit the paper.',
                    'Full screen is enforced where the browser allows it, as on Android, and skipped on iPhone, where Safari can’t do it.',
                    'Copy, paste and right-click can be switched off.',
                ],
                takeaway: 'A rule that only works on a laptop protects nobody in a batch that writes on phones.',
            },
        ],
        caption: 'The left column describes a common pattern in desktop-first exam software, not one product. Check the software you use against it.',
    },
    scenarios: {
        title: 'What happens when…',
        sub: 'Pick something that will happen in your batch.',
        columns: ['On their phone', 'In your exam room', 'Tell the batch'],
        items: [
            {
                id: 'lock',
                label: 'Screen locks',
                icon: 'lock',
                title: 'The screen locks while they think',
                lines: [
                    'The clock keeps running, because it belongs to the exam, not the phone. They unlock and the paper is where they left it. On a live exam the page asks the browser to keep the screen awake, on browsers that support it.',
                    'If you switched on tab-switch rules, a locked screen counts as leaving the exam screen, and their row shows the warning.',
                    'Keep the screen on. Don’t lock the phone to think.',
                ],
            },
            {
                id: 'call',
                label: 'A call',
                icon: 'phone-call',
                title: 'A call comes in at question 23',
                lines: [
                    'If the call takes over the screen, the exam is out of sight until they come back. The paper is exactly where it was, and the timer did not pause.',
                    'With tab-switch rules on, the switch to the call is counted like any other.',
                    'Turn on Do Not Disturb before the code goes up.',
                ],
            },
            {
                id: 'signal',
                label: 'No signal',
                icon: 'wifi-off',
                title: 'The signal drops for three minutes',
                lines: [
                    'The dot in the top bar turns red: “No internet — answers saved locally”. They keep answering. The answers go to the server with the next save once the signal is back.',
                    'Their row says “No signal” and for how long, so you know who is affected and can give extra time to one candidate.',
                    'Don’t refresh and don’t close the tab. Keep answering; it catches up.',
                ],
            },
            {
                id: 'battery',
                label: 'Phone dies',
                icon: 'battery-low',
                title: 'The phone dies at minute 40',
                lines: [
                    'Everything up to the last save is on the server, so about 20 seconds of work is at risk. They join again on any device with the same details and carry on with the time that is left.',
                    'Their row stops updating, then shows “Changed device” when they come back on the new one. The old phone is signed out.',
                    'Charge to at least half. If the phone dies, rejoin on any device: it is allowed.',
                ],
            },
            {
                id: 'switch',
                label: 'Opens WhatsApp',
                icon: 'message-circle',
                title: 'They open WhatsApp mid-paper',
                lines: [
                    'The browser notices the exam left the screen. With tab-switch rules on, they see a warning with the count, and at your limit the paper submits itself.',
                    'Their row shows how many times they left the exam screen.',
                    'Say the rule out loud: leaving the exam screen is counted, and at the limit the paper is submitted.',
                ],
            },
            {
                id: 'iphone',
                label: 'iPhone',
                icon: 'smartphone',
                title: 'A candidate has an iPhone',
                lines: [
                    'Safari on iPhone can’t put a web page in full screen, so the full-screen rule is skipped there instead of trapping them behind a warning they can’t clear. Switching apps is still noticed.',
                    'Nothing different: an iPhone candidate appears like any other.',
                    'Safari or Chrome is fine. Nothing to install.',
                ],
            },
            {
                id: 'reload',
                label: 'Reloads',
                icon: 'refresh-cw',
                title: 'They reload the page',
                lines: [
                    'The paper comes back with their answers and the right time left. On a paper with timed sections, they land in the section that is open now.',
                    'No change.',
                    'Reloading is safe, but it costs seconds. Don’t.',
                ],
            },
            {
                id: 'time',
                label: 'Time runs out',
                icon: 'timer',
                title: 'Time runs out mid-answer',
                lines: [
                    'On a live exam, the paper submits itself a couple of seconds after the clock reaches zero, with what is answered. No button to find.',
                    'Their row moves to Submitted and the rank list fills in.',
                    'Spend the last minute on a question, not on the Submit button.',
                ],
            },
        ],
        caption: 'Each answer is what the exam screen does today, on a live exam with a join code. Tab-switch and full-screen rules apply only when you switch them on.',
    },
    steps: {
        title: 'Your first phone exam',
        sub: 'Tick them off as you go.',
        items: [
            { id: 'paper', title: 'Build or import the paper', detail: 'Upload a PDF or photos, or type it in the builder. Short options and wide diagrams read best on a phone.', minutes: 8 },
            { id: 'read', title: 'Read it on your own phone', detail: 'Open the test on a phone before anyone else does. Fix anything that needs pinching or sideways scrolling.', minutes: 6 },
            { id: 'rules', title: 'Decide the rules', detail: 'Tab-switch limit, full screen, copy and paste off. Decide what a switch costs before exam day, not during it.', minutes: 2 },
            { id: 'exam', title: 'Create the live exam', detail: 'Pick the batch and how candidates check in: name, roll number, or roll number and PIN. You get a code and a QR code.', minutes: 2 },
            { id: 'send', title: 'Send the code with three rules', detail: 'Charge the phone, turn on Do Not Disturb, don’t close the tab. Send it the evening before.', minutes: 2 },
            { id: 'run', title: 'Press Start and watch the room', detail: 'The lobby fills, you start, and each row shows minutes left, questions answered and any flags.', minutes: 2 },
        ],
        caption: 'Minutes are for a 30-question paper you already have, including one read-through on a phone.',
        doneText: 'Ready for Sunday.',
    },
};

// ── /embed-test-on-website ──────────────────────────────────────────────────

const EMBED: HowtoPage = {
    key: 'embed',
    hero: {
        title: 'Put a test on your website',
        tag: 'Website',
        groups: [
            {
                label: 'What goes on your page',
                icon: 'layout-template',
                rows: [
                    { icon: 'mouse-pointer-click', label: 'A button: “Start the test”' },
                    { icon: 'id-card', label: 'A card with the title, questions and minutes' },
                    { icon: 'key-round', label: 'A box for exam days: “Enter your code”' },
                    { icon: 'qr-code', label: 'A QR code for posters and printed sheets' },
                ],
            },
            {
                label: 'What happens on a tap',
                icon: 'sparkles',
                us: true,
                rows: [
                    { icon: 'maximize', label: 'The exam opens in its own tab, full size' },
                    { icon: 'shield-check', label: 'Full screen and tab-switch rules work' },
                    { icon: 'cloud', label: 'Answers save to the server as they write' },
                    { icon: 'bar-chart-3', label: 'Results land in your TestoZa dashboard' },
                ],
            },
        ],
        foot: 'No plugin and no script: a few lines of HTML that any website builder accepts.',
    },
    stats: [
        { dt: 'Plugins to install', dd: '0' },
        { dt: 'Scripts on your page', dd: '0' },
        { dt: 'Cost of the code', dd: '₹0' },
        { dt: 'Website builders covered', dd: '8' },
    ],
    checked: 'Framing headers checked on testoza.com and app.testoza.com on 13 October 2026',
    compare: {
        title: 'A test inside a frame, and a test behind a button',
        themLabel: 'Inside an iframe',
        usLabel: 'A button that opens it',
        themes: [
            {
                id: 'works',
                label: 'Does it work?',
                question: 'Will a TestoZa test show inside a frame on my site?',
                them: [
                    'No. TestoZa’s pages tell browsers not to display them inside another website’s frame (X-Frame-Options: SAMEORIGIN). You would get an empty box or a “refused to connect” message.',
                ],
                us: [
                    'Yes, on any builder that lets you add a link, a button or a block of HTML.',
                    'The generator on this page writes the HTML for you.',
                ],
                takeaway: 'Check this first with any tool you are considering: plenty of exam pages refuse to be framed, for the same security reasons.',
            },
            {
                id: 'screen',
                label: 'Screen space',
                question: 'How much of a phone screen does the candidate get?',
                them: [
                    'Whatever your page leaves: your header, menu and footer stay around a box.',
                    'Scrolling inside a box that sits inside a scrolling page, with the keyboard covering half of what is left.',
                ],
                us: [
                    'The whole screen. The test opens in its own tab, the way a link from WhatsApp does.',
                    'Your page stays open behind it, so they come back to your site afterwards.',
                ],
                takeaway: 'On a laptop a frame is cramped. On a phone it is a keyhole.',
            },
            {
                id: 'rules',
                label: 'Exam rules',
                question: 'Can full screen and tab-switch rules work?',
                them: [
                    'Full screen inside a frame works only if the embed code grants it (allow="fullscreen"), and not every website builder lets you edit that.',
                    'Your site’s own pop-ups, chat bubbles and cookie banners sit on top of the test.',
                ],
                us: ['Full screen, tab-switch limits, copy and paste off: all of them work, because the exam is the only thing on the screen.'],
                takeaway: 'An exam needs the whole screen to be fair. A page with other things on it is a distraction at best.',
            },
            {
                id: 'saving',
                label: 'Saved answers',
                question: 'Where do sign-ins and saved answers live?',
                them: [
                    'Browsers now keep a framed page’s storage separate from the same site opened directly (storage partitioning), so a sign-in or a saved draft in one does not carry over to the other.',
                    'Google sign-in pages refuse to open inside frames at all.',
                ],
                us: ['In one place: the test’s own page, opened the same way every time. On a live exam, answers reach the server every 20 seconds.'],
                takeaway: 'Anything that depends on “the browser remembers me” is fragile inside a frame.',
            },
            {
                id: 'speed',
                label: 'Your page speed',
                question: 'What does it do to my website?',
                them: ['A frame loads a whole web application inside your page, often on every visit, whether or not anyone takes the test.'],
                us: ['A button or a card is a few hundred bytes of HTML. Nothing loads from TestoZa until somebody taps it.'],
                takeaway: 'A heavy frame slows the page your visitors came for. A link costs nothing.',
            },
        ],
        caption: 'The left column describes how browsers treat frames today, not one website builder. The TestoZa header was read from the live site.',
    },
    steps: {
        title: 'Your test on your site',
        sub: 'Five steps, about ten minutes.',
        items: [
            { id: 'link', title: 'Copy the test’s link', detail: 'On My Tests, open the test’s menu and choose Share link. A private test has no link: make it public, or run it as a live exam.', minutes: 1 },
            { id: 'code', title: 'Make the code', detail: 'Paste the link into the generator on this page, pick a button, a card or a code box, and copy it.', minutes: 1 },
            { id: 'paste', title: 'Paste it into your site', detail: 'WordPress: a Custom HTML block. Google Sites: Embed, then Embed code. Wix: Embed HTML. Blogger: an HTML/JavaScript gadget.', minutes: 3 },
            { id: 'words', title: 'Write two lines around it', detail: 'How many questions, how long, whether a wrong answer costs marks, and that no account is needed.', minutes: 3 },
            { id: 'phone', title: 'Try it on a phone', detail: 'Open your page on a phone, tap the button, answer one question and close the tab.', minutes: 2 },
        ],
        caption: 'Minutes assume the test already exists. Building it is a separate job.',
        doneText: 'It’s on your site.',
    },
};

/** The embed generator: what the reader can put on a page. */
export const EMBED_STYLES = [
    { id: 'button', label: 'Button', hint: 'One line, sits anywhere in your text.' },
    { id: 'card', label: 'Card', hint: 'Title, facts and a button: best on a page of its own.' },
    { id: 'code', label: 'Code box', hint: 'For live exams: the code changes, the box never does.' },
    { id: 'qr', label: 'QR code', hint: 'For posters, notice boards and printed sheets.' },
] as const;

export type EmbedStyle = (typeof EMBED_STYLES)[number]['id'];

export const EMBED_COLORS = [
    { id: 'blue', label: 'Blue', hex: '#0071e3' },
    { id: 'green', label: 'Green', hex: '#1d7f3a' },
    { id: 'black', label: 'Black', hex: '#1d1d1f' },
    { id: 'orange', label: 'Orange', hex: '#c2410c' },
] as const;

/** What the generator starts with: a believable link the reader replaces with their own. */
export const EMBED_SAMPLE = {
    link: 'https://app.testoza.com/test/weekly-test-7-k3p9',
    title: 'Weekly Test 7: Kinematics',
    facts: '30 questions · 45 minutes · No account needed',
    button: 'Start the test',
};

export interface EmbedInput {
    style: EmbedStyle;
    href: string;
    title: string;
    facts: string;
    button: string;
    color: string;
}

/** Escape text for HTML (attribute or text). */
export const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";

/**
 * Inline styles for the generated HTML, as CSS text. The React preview parses the same
 * strings, so what a reader copies and what they see are one thing.
 */
export const embedCss = (color: string) => ({
    button: `display:inline-block;padding:14px 24px;border-radius:999px;background:${color};color:#ffffff;font:600 16px/1.2 ${FONT};text-decoration:none`,
    card: `max-width:420px;padding:20px;border:1px solid #e5e5ea;border-radius:16px;background:#ffffff;color:#1d1d1f;font-family:${FONT}`,
    eyebrow: 'margin:0 0 4px;font-size:13px;color:#6e6e73',
    title: 'margin:0 0 6px;font-size:19px;font-weight:600;line-height:1.3',
    facts: 'margin:0 0 16px;font-size:14px;line-height:1.45;color:#424245',
    figure: `margin:0;display:inline-block;text-align:center;font-family:${FONT}`,
    caption: 'margin-top:8px;font-size:14px;color:#424245',
});

/** The HTML a reader copies. `qrSvg` is the QR code's markup, made in the browser. */
export function embedHtml(input: EmbedInput, qrSvg?: string): string {
    const css = embedCss(input.color);
    const href = escapeHtml(input.href);
    const a = (label: string) => `<a href="${href}" target="_blank" rel="noopener" style="${css.button}">${escapeHtml(label)}</a>`;
    switch (input.style) {
        case 'button':
            return a(input.button);
        case 'card':
            return [
                `<div style="${css.card}">`,
                `  <p style="${css.eyebrow}">Online test</p>`,
                `  <p style="${css.title}">${escapeHtml(input.title)}</p>`,
                `  <p style="${css.facts}">${escapeHtml(input.facts)}</p>`,
                `  ${a(input.button)}`,
                `</div>`,
            ].join('\n');
        case 'code':
            return [
                `<div style="${css.card}">`,
                `  <p style="${css.eyebrow}">Exam today?</p>`,
                `  <p style="${css.title}">Enter the code your teacher gives you</p>`,
                `  <p style="${css.facts}">Six digits, given out at the start of each exam. No app and no account needed.</p>`,
                `  ${a(input.button)}`,
                `</div>`,
            ].join('\n');
        case 'qr':
            return [
                `<figure style="${css.figure}">`,
                `  <a href="${href}" target="_blank" rel="noopener" style="display:inline-block;width:180px;height:180px">${qrSvg ?? '<!-- QR code -->'}</a>`,
                `  <figcaption style="${css.caption}">Scan to ${escapeHtml(input.button.toLowerCase())}</figcaption>`,
                `</figure>`,
            ].join('\n');
    }
}

/**
 * Turns what the reader pasted into a link the code can point at. Only TestoZa links and
 * join codes are accepted: the generator writes a launcher for a test, not for any URL.
 */
export function resolveEmbedLink(raw: string, style: EmbedStyle): { href: string; note: string; ok: boolean } {
    const text = raw.trim();
    const digits = text.replace(/\s+/g, '');
    if (/^\d{6}$/.test(digits)) return { href: `https://testoza.com/join/${digits}`, note: `Join code ${digits.slice(0, 3)} ${digits.slice(3)}: opens straight into that exam.`, ok: true };
    if (style === 'code' && !text) return { href: 'https://testoza.com/join', note: 'Opens testoza.com/join, where candidates type the day’s code.', ok: true };
    if (!text) return { href: EMBED_SAMPLE.link, note: 'Sample link: paste your own test’s link to replace it.', ok: true };
    let url: URL;
    try {
        url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    } catch {
        return { href: EMBED_SAMPLE.link, note: 'That doesn’t look like a link. Paste your test’s link or a six-digit join code.', ok: false };
    }
    if (!/^(app\.)?testoza\.com$/i.test(url.hostname)) {
        return { href: EMBED_SAMPLE.link, note: 'Paste a TestoZa link (app.testoza.com/test/…) or a six-digit join code.', ok: false };
    }
    url.protocol = 'https:';
    url.hash = '';
    return { href: url.toString(), note: 'Your link. The button opens it in a new tab.', ok: true };
}

/** Where to paste the code, builder by builder. Used by the guide text and its table. */
export const BUILDERS = [
    { name: 'WordPress', where: 'Add a Custom HTML block (in Elementor, the HTML widget) and paste the code.', simple: 'Or add a Buttons block and paste the link.' },
    { name: 'Google Sites', where: 'Insert, then Embed, then the Embed code tab. Paste and click Next.', simple: 'Or Insert, then Button: give it a name and paste the link.' },
    { name: 'Wix', where: 'Add Elements, then Embed Code, then Embed HTML. Choose Code and paste.', simple: 'Or add a Button and set its link to your test.' },
    { name: 'Blogger', where: 'Layout, Add a Gadget, HTML/JavaScript. Inside a post, switch to HTML view first.', simple: 'Or select text in a post and add a link.' },
    { name: 'Squarespace', where: 'A Code block, on plans that allow custom code.', simple: 'Or a Button block with the link, on any plan.' },
    { name: 'Webflow', where: 'Drag in a Code Embed element and paste.', simple: 'Or a Button with the link.' },
    { name: 'Shopify', where: 'In the theme editor, add a Custom Liquid section and paste.', simple: 'Or a button in a Rich text section.' },
    { name: 'Plain HTML', where: 'Paste it where you want the button to appear in the page’s HTML.', simple: 'Or an ordinary link, styled like your other buttons.' },
] as const;

// ── /full-length-online-test-maker ──────────────────────────────────────────

const FULL_LENGTH: HowtoPage = {
    key: 'fullLength',
    hero: {
        title: 'What makes a mock “full-length”',
        tag: 'Mock',
        groups: [
            {
                label: 'The same as the real paper',
                icon: 'copy-check',
                rows: [
                    { icon: 'list-ordered', label: 'Every question, not a sample of them' },
                    { icon: 'timer', label: 'The full duration, on one clock' },
                    { icon: 'layers', label: 'Its sections, and their own clocks if it has them' },
                    { icon: 'minus-circle', label: 'Its marking: +4/−1, partial marks, ¼ off' },
                    { icon: 'layout-grid', label: 'Its screen: palette, Mark for review' },
                ],
            },
            {
                label: 'What the software has to hold',
                icon: 'sparkles',
                us: true,
                rows: [
                    { icon: 'cloud', label: 'Three hours without losing an answer' },
                    { icon: 'battery-low', label: 'A phone that dies at minute 140' },
                    { icon: 'bar-chart-3', label: 'Section-wise results when the clock stops' },
                ],
            },
        ],
        foot: 'Shorten any one of these and you are rehearsing a different exam.',
    },
    stats: [
        { dt: 'Questions in a NEET mock', dd: '180' },
        { dt: 'Saved to the server every', dd: '20', small: 'sec' },
        { dt: 'Break between two papers', dd: '0–180', small: 'min' },
        { dt: 'To build and run it', dd: '₹0' },
    ],
    checked: 'Exam patterns checked against NTA, SSC and IBPS notices; product facts against TestoZa on 13 October 2026',
    compare: {
        title: 'A form tool and an exam platform, for a three-hour paper',
        themLabel: 'Google Forms',
        usLabel: 'TestoZa',
        themes: [
            {
                id: 'clock',
                label: 'The clock',
                question: 'Who keeps the time for three hours?',
                them: [
                    'Google Forms has no timer of its own. A three-hour paper relies on an add-on or on the honour system.',
                    'Nothing closes the form when the time is up; you close it by hand.',
                ],
                us: [
                    'One clock for the paper, kept by the server and shown on every screen.',
                    'Sections can have their own minutes and close on their own, and the paper submits itself at the end.',
                ],
                takeaway: 'Time pressure is half of what a full-length mock is for. A paper without a clock is an open-book homework.',
            },
            {
                id: 'marking',
                label: 'Marking',
                question: 'Can a wrong answer cost a mark?',
                them: [
                    'Quiz questions earn points when right; there is no negative marking.',
                    'Checkbox questions are all-or-nothing: no partial credit.',
                ],
                us: [
                    'Marks and Wrong on every question card: +4 and −1, +2 and −0.5, a quarter off.',
                    'Partial marks on multiple-correct questions, proportional or the JEE Advanced rule, and numerical answers within a range.',
                ],
                takeaway: 'A mock without negative marking teaches students to guess, which is the most expensive habit in an entrance exam.',
            },
            {
                id: 'moving',
                label: 'Moving around',
                question: 'How does a candidate move around 180 questions?',
                them: ['By scrolling one long page, or clicking through sections in order.', 'No palette and no Mark for review.'],
                us: [
                    'A numbered palette with five states, Mark for review, Save & Next and section tabs: the NTA-style screen.',
                    'On a phone the palette slides in from the edge and gets out of the way.',
                ],
                takeaway: 'In a long paper the palette is the map. Students who have never used one lose minutes on the day finding their way.',
            },
            {
                id: 'survive',
                label: 'Three hours',
                question: 'What survives three hours of real life?',
                them: [
                    'Progress is saved as a draft only for respondents signed in to a Google account.',
                    'A closed tab or a dead phone can mean starting again.',
                ],
                us: [
                    'Answers kept on the device and saved to the server every 20 seconds on a live exam.',
                    'Rejoin on any device with the same details and carry on with the time that is left.',
                ],
                takeaway: 'The longer the paper, the more certain it is that something goes wrong in the middle of it.',
            },
            {
                id: 'results',
                label: 'Results',
                question: 'What do you have at the end?',
                them: ['A score per response and a chart per question, in a spreadsheet you sort yourself.'],
                us: [
                    'A rank list as papers come in, scores per section, time per question, and the wrong option most of the batch chose.',
                    'Report cards to print, Excel to download, the rank list for WhatsApp.',
                ],
                takeaway: 'A full-length mock earns its three hours in the analysis afterwards. Without it, it is just a long test.',
            },
        ],
        caption: 'Google Forms facts are from Google’s own help pages as of October 2026. It is a good tool for a ten-question quiz.',
    },
    steps: {
        title: 'One full-length mock, start to finish',
        sub: 'For a paper you already have as a PDF.',
        items: [
            { id: 'upload', title: 'Upload last year’s paper', detail: 'The PDF, or photos of the printed pages. The AI reads questions, options, the key, diagrams and equations.', minutes: 3 },
            { id: 'sections', title: 'Split it into sections', detail: 'One per subject, or per the exam’s own sections, so the screen shows tabs and the result splits.', minutes: 3 },
            { id: 'marks', title: 'Set the marks once', detail: 'Marks and Wrong on the first question; each new one copies it. Override a section where the pattern differs.', minutes: 3 },
            { id: 'clock', title: 'Set the clock', detail: 'The total minutes, and Time each section if the real exam closes its sections on their own.', minutes: 1 },
            { id: 'read', title: 'Read the whole paper on a phone', detail: 'Every question once, the way a candidate will see it. This is the step that cannot be skipped.', minutes: 25 },
            { id: 'live', title: 'Create the live exam for Sunday', detail: 'Pick the batch, the start time and how candidates check in. Send the code the evening before.', minutes: 3 },
        ],
        caption: 'Minutes are for a full paper of 75 to 180 questions, and most of them are the read-through.',
        doneText: 'Sunday is set.',
    },
};

/** Exam patterns for the paper planner. Every figure is from an existing, checked guide. */
export interface PaperSection {
    name: string;
    questions: number;
    /** Own clock, when the exam times sections separately. */
    minutes?: number;
    note?: string;
}

export interface PaperPattern {
    id: string;
    label: string;
    name: string;
    minutes: number;
    marks: string;
    marking: string;
    timing: 'one' | 'sections';
    sections: PaperSection[];
    setup: { label: string; value: string }[];
    lesson: string;
}

export const PAPER_PATTERNS: PaperPattern[] = [
    {
        id: 'jee',
        label: 'JEE Main',
        name: 'JEE Main, B.E./B.Tech paper',
        minutes: 180,
        marks: '300',
        marking: '+4 for a correct answer, −1 for a wrong multiple-choice answer; numericals as the year’s bulletin states',
        timing: 'one',
        sections: [
            { name: 'Physics', questions: 25, note: '20 multiple-choice, 5 numerical' },
            { name: 'Chemistry', questions: 25, note: '20 multiple-choice, 5 numerical' },
            { name: 'Mathematics', questions: 25, note: '20 multiple-choice, 5 numerical' },
        ],
        setup: [
            { label: 'Sections', value: '3, one per subject' },
            { label: 'Clock', value: 'One clock, 180 min' },
            { label: 'Marks / Wrong', value: '+4 / −1' },
            { label: 'Question types', value: 'Single correct, Numerical' },
        ],
        lesson: 'Three subjects on one clock: the candidate decides the order and the split. A full mock is the only place to practise that decision.',
    },
    {
        id: 'neet',
        label: 'NEET',
        name: 'NEET (UG)',
        minutes: 180,
        marks: '720',
        marking: '+4 for a correct answer, −1 for a wrong one, 0 for a blank',
        timing: 'one',
        sections: [
            { name: 'Physics', questions: 45 },
            { name: 'Chemistry', questions: 45 },
            { name: 'Botany', questions: 45 },
            { name: 'Zoology', questions: 45 },
        ],
        setup: [
            { label: 'Sections', value: '4 of 45 questions' },
            { label: 'Clock', value: 'One clock, 180 min' },
            { label: 'Marks / Wrong', value: '+4 / −1' },
            { label: 'Question types', value: 'Single correct' },
        ],
        lesson: '180 questions in 180 minutes is 60 seconds each on average, and nobody spends it evenly. Only a full paper shows where a candidate’s minutes really go.',
    },
    {
        id: 'jadv',
        label: 'JEE Advanced',
        name: 'JEE Advanced, one paper (2024 Paper 1 as an example)',
        minutes: 180,
        marks: '180 a paper, 360 for both',
        marking: 'Set per section: +3/−1 one-correct, +4 with partial marks and −2 one-or-more-correct, +4 and no negative for numericals, +3/−1 matching',
        timing: 'one',
        sections: [
            { name: 'Physics', questions: 17, note: '4 one-correct, 3 one-or-more, 6 numerical, 4 matching' },
            { name: 'Chemistry', questions: 17, note: 'Same mix' },
            { name: 'Mathematics', questions: 17, note: 'Same mix' },
        ],
        setup: [
            { label: 'Sections', value: 'Per subject, marks per section' },
            { label: 'Partial marks', value: 'JEE Advanced rule' },
            { label: 'Numericals', value: 'Answer as a range' },
            { label: 'Two papers', value: 'Combined test, timed break' },
        ],
        lesson: 'The pattern changes from year to year and is announced in the paper’s own instructions. Build sections you can re-mark, not one hard-coded scheme.',
    },
    {
        id: 'ssc',
        label: 'SSC CGL',
        name: 'SSC CGL 2026, Tier 1',
        minutes: 60,
        marks: '200',
        marking: '+2 for a correct answer, −0.5 for a wrong one',
        timing: 'sections',
        sections: [
            { name: 'General Intelligence and Reasoning', questions: 25, minutes: 15 },
            { name: 'General Awareness', questions: 25, minutes: 15 },
            { name: 'Quantitative Aptitude', questions: 25, minutes: 15 },
            { name: 'English Comprehension', questions: 25, minutes: 15 },
        ],
        setup: [
            { label: 'Sections', value: '4 of 25 questions' },
            { label: 'Clock', value: 'Time each section: 15 min' },
            { label: 'Marks / Wrong', value: '+2 / −0.5' },
            { label: 'Calculator', value: 'Off' },
        ],
        lesson: 'Each section closes after its 15 minutes, with no going back and no carrying time forward. Sectional drills can’t teach that; a full paper with timed sections can.',
    },
    {
        id: 'ibps',
        label: 'IBPS PO',
        name: 'IBPS PO 2026, Prelims',
        minutes: 60,
        marks: '100',
        marking: 'A quarter of a question’s marks off for a wrong answer; five options a question',
        timing: 'sections',
        sections: [
            { name: 'English Language', questions: 30, minutes: 20 },
            { name: 'Quantitative Aptitude', questions: 35, minutes: 20 },
            { name: 'Reasoning Ability', questions: 35, minutes: 20 },
        ],
        setup: [
            { label: 'Sections', value: '3, with their own clock' },
            { label: 'Clock', value: 'Time each section: 20 min' },
            { label: 'Options', value: 'Five (add option E)' },
            { label: 'Wrong', value: '¼ of the question’s marks' },
        ],
        lesson: 'How the 100 marks split across the three sections differs between sources; take it from the call letter. The 20-minute walls are not in doubt.',
    },
];

/** Seconds a question, on average, in a section or a paper. */
export const secondsEach = (minutes: number, questions: number) => Math.round((minutes * 60) / questions);

// ── /share-test-on-whatsapp ─────────────────────────────────────────────────

const WHATSAPP: HowtoPage = {
    key: 'whatsapp',
    hero: {
        title: 'What a good test message does',
        tag: 'WhatsApp',
        groups: [
            {
                label: 'In the group, in three seconds',
                icon: 'message-circle',
                rows: [
                    { icon: 'bold', label: 'Names the test, in bold' },
                    { icon: 'timer', label: 'Says how many questions and how long' },
                    { icon: 'link', label: 'Has one link. Never two.' },
                    { icon: 'user-check', label: 'Says “no app and no account”' },
                ],
            },
            {
                label: 'After the test',
                icon: 'sparkles',
                us: true,
                rows: [
                    { icon: 'list-ordered', label: 'The rank list back to the same group' },
                    { icon: 'users', label: 'A note to each parent, one tap each' },
                    { icon: 'user-x', label: 'A note to the parents of the absent' },
                ],
            },
        ],
        foot: 'TestoZa writes each of these messages and opens WhatsApp. You press send.',
    },
    stats: [
        { dt: 'Links in the message', dd: '1' },
        { dt: 'Accounts to create', dd: '0' },
        { dt: 'Join code', dd: '6', small: 'digits' },
        { dt: 'Sent without your tap', dd: '0' },
    ],
    checked: 'Messages copied from the product’s own share text on 13 October 2026',
    compare: {
        title: 'A link pasted on its own, and a proper invitation',
        themLabel: 'A bare link',
        usLabel: 'A TestoZa invitation',
        themes: [
            {
                id: 'what',
                label: 'What is it?',
                question: 'Can a student tell what this is without opening it?',
                them: ['A long address, and maybe a preview card if the page has one. Nothing about which test, how long, or whether it counts.'],
                us: [
                    'The test’s name in bold, then the facts: “30 questions · 45 min”.',
                    'A preview card that names the test, written by TestoZa for that test’s page.',
                ],
                takeaway: 'In a busy group a message has about three seconds. If it doesn’t say what it is, it gets scrolled past.',
            },
            {
                id: 'account',
                label: 'Sign up?',
                question: 'Does the student have to make an account?',
                them: ['Nobody knows until they open it, so a third of the batch asks in the group instead.'],
                us: [
                    '“No app and no account needed — just type your name.” If you switched on sign-in for that test, the message says to sign in instead.',
                ],
                takeaway: 'Answer the question every student asks before they ask it, and the group stays quiet.',
            },
            {
                id: 'links',
                label: 'How many links',
                question: 'What if the link doesn’t work?',
                them: ['Teachers often add a second, “backup” link. It tells the batch the first one is unreliable, and they pick the wrong one.'],
                us: ['One link, always on the same address, never a fallback. For a live exam, the code is in the message too, so a broken link is never the end.'],
                takeaway: 'Two links is one too many. Give one link and a code they can type.',
            },
            {
                id: 'code',
                label: 'Live exam',
                question: 'How does a whole batch start at 10 a.m.?',
                them: ['Everyone opens the link whenever they see it. There is no “start”, so there is no fair start.'],
                us: [
                    'Three numbered steps: open testoza.com/join, enter the code (in bold, with a space in the middle), type your name or roll number.',
                    'Candidates wait in a lobby until you press Start, or until the start time you set.',
                ],
                takeaway: 'For a paper that counts, a code and a lobby give you the one thing a link can’t: everyone starting together.',
            },
            {
                id: 'after',
                label: 'Afterwards',
                question: 'What goes back to the group?',
                them: ['A screenshot of a spreadsheet, typed out by hand, the next day.'],
                us: [
                    'The rank list as a WhatsApp message, with medals for the top three, the average and who was absent.',
                    'A short note per parent, opened in WhatsApp to their number, one tap each.',
                ],
                takeaway: 'Results that arrive the same evening get read. Results that arrive on Wednesday get argued with.',
            },
        ],
        caption: 'The right-hand column is the text TestoZa puts in the message; you can edit it in WhatsApp before you send.',
    },
    scenarios: {
        title: 'What happens when…',
        sub: 'The questions teachers get in the group, answered.',
        columns: ['What happens', 'What you see', 'What to do'],
        items: [
            {
                id: 'forward',
                label: 'Forwarded',
                icon: 'forward',
                title: 'Someone forwards the code outside the batch',
                lines: [
                    'With a batch list on the exam, a name or roll number that isn’t on it is turned away: “not on this batch’s list”, unless you allowed walk-ins. With roll number and PIN, they also need the PIN on the student’s slip.',
                    'Only candidates who checked in, in the lobby, by name.',
                    'For anything that counts, attach the batch list. For a board exam rehearsal, use roll number and PIN.',
                ],
            },
            {
                id: 'late',
                label: 'Joins late',
                icon: 'clock',
                title: 'A student opens the message after you pressed Start',
                lines: [
                    'They can join until the late-entry limit (15 minutes unless you change it). Their own clock starts when they start, so they get the full duration.',
                    'Their row appears in the exam room when they check in.',
                    'Set late entry to what you would allow at a real centre, and say it in the message.',
                ],
            },
            {
                id: 'two',
                label: 'Two phones',
                icon: 'smartphone',
                title: 'The same student joins on two phones',
                lines: [
                    'A seat is open on one device at a time. Joining on the second phone signs out the first.',
                    '“Changed device” on their row.',
                    'Nothing, unless it keeps happening.',
                ],
            },
            {
                id: 'wrong',
                label: 'Wrong code',
                icon: 'key-round',
                title: 'A student types the code wrong',
                lines: [
                    'The join page says so, and they try again. After too many tries in a minute it asks them to wait a minute.',
                    'Nothing: they haven’t joined yet.',
                    'Keep the code in bold with a space in the middle, *482 913*. The invitation already does that.',
                ],
            },
            {
                id: 'account',
                label: 'Sign up?',
                icon: 'user-check',
                title: '“Do I need to sign up?”',
                lines: [
                    'Not for a live exam, and not for a test link unless you switched on “candidates must sign in”. The invitation already says which.',
                    'Nothing.',
                    'Leave sign-in off for a batch you know. Turn it on only when students need their own history across tests.',
                ],
            },
            {
                id: 'result',
                label: 'Their result',
                icon: 'file-text',
                title: '“Where is my result?” on Monday',
                lines: [
                    'Candidates from a live exam can look their result up later with the code, once you have released results: when the exam ends, as each paper is submitted, or by hand.',
                    'Who has submitted, and the rank list for the batch.',
                    'Send the rank list the same evening, and a note to each parent if you have their numbers.',
                ],
            },
        ],
        caption: 'Behaviour of a live exam with a join code, checked against the product on 13 October 2026.',
    },
    steps: {
        title: 'One test, one evening, one group',
        sub: 'From saved test to rank list.',
        items: [
            { id: 'choose', title: 'Choose link or code', detail: 'Practice anyone can take any time: a test link. A paper everyone sits together: a live exam with a code.', minutes: 1 },
            { id: 'share', title: 'Press Share, or WhatsApp', detail: 'On a phone, Share opens the share sheet; on a computer it copies the whole message. A live exam has a WhatsApp button.', minutes: 1 },
            { id: 'group', title: 'Pick the batch group and send', detail: 'Send the evening before, then once more 15 minutes before the start. Pin it if you are an admin.', minutes: 2 },
            { id: 'start', title: 'Start the exam', detail: 'For a live exam, press Start when the lobby is full, or let the start time do it.', minutes: 1 },
            { id: 'ranks', title: 'Send the rank list back', detail: 'Send rank list on WhatsApp writes it for you: medals, average, absentees.', minutes: 1 },
            { id: 'parents', title: 'Send each parent their note', detail: 'The Parent button beside each student whose parent’s number is on the batch list, from a tablet or computer. Nothing goes out on its own.', minutes: 6 },
        ],
        caption: 'Parent notes take longest: about ten seconds each for a batch of 40, and they are the messages parents remember.',
        doneText: 'Everyone has it.',
    },
};

// ── /best-online-exam-software-india ────────────────────────────────────────
// A comparison page on the same shell. Rival facts are the ones checked for the
// alternative guides (2–15 October 2026) plus Eklavvya, TCS iON and Testpress from their
// own sites and SpeedExam / ProProfs prices re-checked on 25 October 2026; see the header
// of guides/bestOnlineExamSoftwareIndia.ts.

const BEST_INDIA: HowtoPage = {
    key: 'bestIndia',
    hero: {
        title: 'Pick by what the exam decides',
        tag: 'India 2026',
        groups: [
            {
                label: 'A quick check in class',
                icon: 'mouse-pointer-click',
                rows: [
                    { icon: 'message-circle', label: 'Kahoot or Wayground: a live game in the room' },
                    { icon: 'file-text', label: 'Google Forms: a ten-question recap' },
                ],
            },
            {
                label: 'Weekly tests and mocks for your own batch',
                icon: 'sparkles',
                us: true,
                rows: [
                    { icon: 'smartphone', label: 'TestoZa: NTA-style mocks on students’ phones' },
                    { icon: 'layout-grid', label: 'Classplus or Testpress: tests inside your own app' },
                    { icon: 'layers', label: 'Moodle: if your college already runs it' },
                ],
            },
            {
                label: 'Exams that decide a job, a degree or a licence',
                icon: 'shield-check',
                rows: [
                    { icon: 'id-card', label: 'Mercer Mettl: webcam proctoring and ID checks' },
                    { icon: 'copy-check', label: 'Eklavvya: descriptive answers marked on screen' },
                    { icon: 'users', label: 'TCS iON: exams at national scale, in centres' },
                ],
            },
        ],
        foot: 'The higher the stakes, the heavier the tool. We make TestoZa; every other name is described from its own pages.',
    },
    stats: [
        { dt: 'Platforms compared', dd: '13' },
        { dt: 'Checks for an Indian paper', dd: '8' },
        { dt: 'Indian phones on Android', dd: '93.9', small: '%' },
        { dt: 'TestoZa for a whole year', dd: '₹799' },
    ],
    checked: 'Facts from each product’s own pages, checked 2–25 October 2026',
    compare: {
        title: 'Enterprise exam suites and a self-serve platform',
        themLabel: 'Enterprise exam suites',
        usLabel: 'TestoZa',
        themes: [
            {
                id: 'buying',
                label: 'Buying',
                question: 'How do you get started?',
                them: [
                    'A demo call, a requirements form and a quote. Mercer Mettl, TCS iON, Classplus, Teachmint and Eklavvya’s paid plans all start this way.',
                    'Contracts usually run for a year.',
                ],
                us: [
                    'Sign up and build a test the same evening. The price is on the pricing page: ₹49 for 7 days, ₹149 for 30 days, ₹799 a year.',
                    'A pass for exam season only is fine.',
                ],
                takeaway: 'If you need the paper this week, a sales cycle is the first thing that fails.',
            },
            {
                id: 'device',
                label: 'The device',
                question: 'What does a candidate sit the exam on?',
                them: [
                    'Often a laptop or desktop with a webcam: Mettl’s help centre says its proctored tests don’t run on phones or tablets.',
                    'Sometimes a secure browser to install, or a seat at a test centre.',
                ],
                us: ['The phone they already have, in its ordinary browser. A whole batch joins at testoza.com/join with one six-digit code.'],
                takeaway: 'Most Indian students own a phone, not a laptop. A laptop rule decides who sits the test.',
            },
            {
                id: 'marking',
                label: 'Marking',
                question: 'Does it mark the way Indian papers mark?',
                them: [
                    'Negative marks are usually there: Mettl has an Incorrect Marks field, SpeedExam a setting.',
                    'JEE Advanced partial marks, numerical ranges and locked section clocks: test them in the demo.',
                ],
                us: [
                    'Marks and Wrong on every question, any decimal.',
                    'JEE Advanced or proportional partial marks, numerical ranges, timed sections, an NTA-style screen.',
                ],
                takeaway: 'Bring last year’s paper to every demo and ask them to mark three wrong answers in front of you.',
            },
            {
                id: 'meter',
                label: 'The meter',
                question: 'What does the price count?',
                them: [
                    'Candidates, attempts or exam credits. SpeedExam counts attempts a month, retakes included; Eklavvya counts one credit per candidate per exam.',
                ],
                us: ['Time. A pass covers the period, however many candidates sit, and there is no cap on a paper.'],
                takeaway: 'Practice tests are where your volume is. A per-candidate meter is cheap for one hiring drive and expensive for a weekly test.',
            },
        ],
        caption:
            'The left column describes Mercer Mettl, Eklavvya, TCS iON, SpeedExam and similar products from their own pages, checked in October 2026. Where they win outright (proctoring, identity checks, descriptive answers) is set out in the reviews.',
    },
    scenarios: {
        title: 'Which one fits you?',
        sub: 'Pick the situation closest to yours.',
        columns: ['What matters most', 'Shortlist', 'First step'],
        items: [
            {
                id: 'coaching',
                label: 'Coaching',
                icon: 'users',
                title: 'A coaching institute with weekly tests and monthly mocks',
                lines: [
                    'Phones, not laptops. Marking that copies JEE, NEET, SSC or bank papers. A rank list the same evening, at a price that doesn’t grow with each admission.',
                    'TestoZa for the tests. Classplus or Testpress if you also want your own app for courses and fees. SpeedExam if you need certificates.',
                    'Run one Sunday mock on TestoZa. Count who sat it from home and how long the rank list took.',
                ],
            },
            {
                id: 'school',
                label: 'School',
                icon: 'layout-grid',
                title: 'A school exam cell setting unit tests and pre-boards',
                lines: [
                    'Teachers who aren’t technical, a paper from the textbook in one evening, Hindi or bilingual papers, report cards parents can read.',
                    'TestoZa for papers and report cards. Teachmint if the school is buying classroom panels. Google Forms for a short recap.',
                    'Ask one teacher to turn last term’s paper into a test with the AI import, and time it.',
                ],
            },
            {
                id: 'college',
                label: 'College',
                icon: 'layers',
                title: 'A college or university running internal and semester exams',
                lines: [
                    'Proctored sittings, descriptive answers, an audit trail, and often a course system already running.',
                    'Eklavvya for descriptive answers, Mercer Mettl for proctoring, Moodle if your IT team runs it. TestoZa for practice in between.',
                    'Split the year: high-stakes sittings on a proctored suite, weekly practice on something lighter.',
                ],
            },
            {
                id: 'hiring',
                label: 'Hiring',
                icon: 'id-card',
                title: 'A company screening candidates or certifying staff',
                lines: [
                    'Strangers with a reason to cheat: identity checks, webcam proctoring, aptitude, coding and psychometric tests.',
                    'Mercer Mettl, Eklavvya, SpeedExam or Testportal. For recruitment at national scale in test centres, TCS iON.',
                    'Not TestoZa: it has no identity checks, camera proctoring or psychometric tests.',
                ],
            },
            {
                id: 'self',
                label: 'Self-study',
                icon: 'smartphone',
                title: 'A student practising on their own',
                lines: [
                    'Tests from your own books and old papers, timed and marked like the real exam, with weak topics named.',
                    'TestoZa: photograph a page or upload a PDF, choose Extract or Generate, keep the test private.',
                    'Make 20 questions from your hardest chapter and sit them with the timer on.',
                ],
            },
            {
                id: 'class',
                label: 'In class',
                icon: 'mouse-pointer-click',
                title: 'A teacher checking a lesson in the room',
                lines: [
                    'Two minutes, every hand up, a bit of noise. Nothing goes on a record.',
                    'Kahoot or Wayground for a game, Socrative for an exit ticket, Google Forms for a quiet recap.',
                    'Keep the game for the room. When the test counts, use software that marks like the exam.',
                ],
            },
        ],
        caption: 'Names come from the reviews below. We make TestoZa, so the Hiring card says plainly where it is the wrong tool.',
    },
    steps: {
        title: 'Trial any platform in one week',
        sub: 'Use your own paper, not the vendor’s sample. Tick each check as you go.',
        items: [
            { id: 'paper', title: 'Bring a real paper', detail: 'Last month’s mock as a PDF, with its answer key and at least one multi-correct and one numerical question.', minutes: 10 },
            { id: 'build', title: 'Build it with your marking', detail: '+4/−1 or whatever your exam uses, its sections and their timing. Note every step that needed a workaround.', minutes: 25 },
            { id: 'phone', title: 'Sit ten questions on the cheapest phone', detail: 'On mobile data. Switch apps once and turn the data off for thirty seconds in the middle.', minutes: 15 },
            { id: 'wrong', title: 'Get three answers wrong on purpose', detail: 'Check the score to the decimal, including the multi-correct question and a blank.', minutes: 10 },
            { id: 'batch', title: 'Run it for one real batch', detail: 'Count how many actually sat it from home, and how long it took until the rank list was out.', minutes: 60 },
            { id: 'price', title: 'Price the year at your real size', detail: 'Students × tests a month × 12. Ask what retakes and unfinished attempts count as.', minutes: 10 },
        ],
        caption: 'Minutes are for one paper of about 30 questions plus one real sitting. A demo call can’t tell you any of this; your own paper can.',
        doneText: 'You know more than any list.',
    },
};

export const HOWTO_PAGES: Record<HowtoKey, HowtoPage> = {
    mobile: MOBILE,
    embed: EMBED,
    fullLength: FULL_LENGTH,
    whatsapp: WHATSAPP,
    bestIndia: BEST_INDIA,
};

// ── The messages on /share-test-on-whatsapp ─────────────────────────────────
// Written exactly as the product writes them (utils/shareUtils.ts testInviteText,
// components/exams/share.ts inviteText, rankListText, parentText), for a made-up batch.

export const WA_SAMPLE = {
    title: 'Weekly Test 7: Kinematics',
    institute: 'Your Institute',
    link: 'https://app.testoza.com/test/weekly-test-7-k3p9',
    code: '482913',
    description: 'Motion in a straight line and projectiles.',
    batch: 'Class 11-A',
    when: 'Tomorrow, 10:00 am',
    questions: 30,
    minutes: 45,
};

export const WA_MESSAGES = [
    {
        id: 'link',
        label: 'Test link',
        when: 'Practice anyone in the group can take, any time',
        text: [
            `📝 *${WA_SAMPLE.title}*`,
            `${WA_SAMPLE.institute} · ${WA_SAMPLE.questions} questions · ${WA_SAMPLE.minutes} min`,
            '',
            'Open this link to start:',
            WA_SAMPLE.link,
            '',
            'No app and no account needed — just type your name.',
        ].join('\n'),
        card: {
            title: `${WA_SAMPLE.title} | TestoZa`,
            text: `${WA_SAMPLE.description} (${WA_SAMPLE.questions} questions, instant results & solutions on TestoZa).`,
            host: 'app.testoza.com',
        },
        from: 'Share on My Tests',
    },
    {
        id: 'code',
        label: 'Live exam',
        when: 'A paper the whole batch sits together',
        text: [
            `📝 *${WA_SAMPLE.title}*`,
            `${WA_SAMPLE.batch} · ${WA_SAMPLE.when} · ${WA_SAMPLE.minutes} min`,
            '',
            '1. Open testoza.com/join',
            `2. Enter code *${WA_SAMPLE.code.slice(0, 3)} ${WA_SAMPLE.code.slice(3)}*`,
            '3. Type your roll number',
            '',
            `Direct link: https://testoza.com/join/${WA_SAMPLE.code}`,
        ].join('\n'),
        card: {
            title: `${WA_SAMPLE.title} — ${WA_SAMPLE.institute}`,
            text: `Enter code ${WA_SAMPLE.code.slice(0, 3)} ${WA_SAMPLE.code.slice(3)} and type your name to start (${WA_SAMPLE.questions} questions, ${WA_SAMPLE.minutes} minutes). No app and no account needed.`,
            host: 'testoza.com',
        },
        from: 'The WhatsApp button on a live exam',
    },
    {
        id: 'ranks',
        label: 'Rank list',
        when: 'Back to the batch group, the same evening',
        text: [
            `🏆 *${WA_SAMPLE.title}* — Sunday mock`,
            '38 candidates · Average 71/120',
            '',
            '🥇 Ananya Rao (07) — 112/120 (93%)',
            '🥈 Kabir Singh (14) — 104/120 (87%)',
            '🥉 Meera Iyer (22) — 101/120 (84%)',
            '4. Rohan Das (03) — 97/120 (81%)',
            '5. Sara Khan (31) — 94/120 (78%)',
            '…',
            '',
            'Absent: Dev Patel, Isha Nair',
        ].join('\n'),
        card: null,
        from: 'Send rank list on WhatsApp, in Results',
    },
    {
        id: 'parent',
        label: 'Parent note',
        when: 'To one parent’s number, one tap each',
        text: [
            'Dear Parent,',
            `Kabir Singh (Roll 14) scored *104/120* (87%) in ${WA_SAMPLE.title}.`,
            'Rank: 2 of 38. Class average: 71.',
            '',
            `— ${WA_SAMPLE.institute}`,
        ].join('\n'),
        card: null,
        from: 'The Parent button beside each candidate, in Results',
    },
] as const;

export type WaMessage = (typeof WA_MESSAGES)[number];
