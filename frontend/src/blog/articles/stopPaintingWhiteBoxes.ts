/**
 * "Stop painting white boxes on your PDFs": the complete guide to Panna
 * (pdf.testoza.com). Rendered by src/pages/blog/StopPaintingWhiteBoxes.tsx and,
 * for crawlers, by the Cloudflare worker through ./worker.ts.
 *
 * Every claim here was checked against the Panna code in src/pdf (September 2026).
 * If a feature changes, change the sentence. Competitor facts come from each
 * company's own website; keep the "checked in" date honest.
 *
 * HTML is written with String.raw so LaTeX backslashes survive. Avoid backticks
 * inside the markup (use &#96;).
 */
import type { StaticArticle, StaticArticleBody } from './types';
import { WHITE_BOXES_META } from './meta';

const h = String.raw;

const EDIT = 'https://pdf.testoza.com/edit-pdf';
const HINDI = 'https://pdf.testoza.com/edit-hindi-pdf';
const LATEX = 'https://pdf.testoza.com/latex-to-pdf';
const CHATGPT = 'https://pdf.testoza.com/chatgpt-to-pdf';
const HUB = 'https://pdf.testoza.com/';
const ASSETS = '/blog-assets/stop-painting-white-boxes';

/** Link to a Panna tool. Opens in a new tab so the reader keeps their place here. */
const tool = (href: string, label: string) => h`<a href="${href}" target="_blank" rel="noopener">${label}</a>`;

/** "Try it" call to action between sections. */
const tryIt = (href: string, label: string, note: string) =>
    h`<p class="wbx-try"><a class="wbx-cta" href="${href}" target="_blank" rel="noopener">${label}<span class="wbx-cta-arrow" aria-hidden="true">→</span></a><span class="wbx-try-note">${note}</span></p>`;

/** A product screenshot (1280×800, with a 640px copy for phones). */
const shot = (name: string, alt: string, caption: string) =>
    h`<figure class="wbx-shot wide"><img src="${ASSETS}/${name}.webp" srcset="${ASSETS}/${name}-640.webp 640w, ${ASSETS}/${name}.webp 1280w" sizes="(max-width: 1000px) calc(100vw - 32px), 960px" width="1280" height="800" loading="lazy" decoding="async" alt="${alt}"><figcaption>${caption}</figcaption></figure>`;

const body: StaticArticleBody = {
    intro: [
        {
            type: 'widget',
            widget: 'white-box-demo',
            fallbackHtml: h`<p><strong>Two ways to fix one date.</strong> A typical white-box editor covers the old “14” with a white rectangle and types “15” on top in Helvetica. Copy the text out of that file and you get “…held on 14 March 2026. 15”, because the old date is still inside it. Panna makes the same fix by rewriting the text itself, in the certificate’s own font, so the copied text reads “…held on 15 March 2026.”</p>`,
        },
        {
            type: 'html',
            html: h`
<p>It’s a quarter to eleven at night. Sixty certificates for the school science fair are sitting in one PDF, the Word file they came from is long gone, and you’ve just noticed the date. It says 14 March. The fair was on the 15th.</p>
<p>So you do what everyone does. You search for a free PDF editor, open the first result, click on the date and type a 5.</p>
<p>The new digit comes out in Arial, sitting a little higher than the serif text around it. The download button asks you to create an account, or wants a card number, or stamps a watermark across the certificate. And there’s a problem you can’t see at all. Many free editors never touched your date. They painted a white rectangle over the 14 and floated a 15 on top of it. Copy the text out of the “corrected” file and the old date is still in there.</p>
<p>Most of us have lived through some version of that evening. It’s the reason we built Panna.</p>
<p><strong>Panna</strong> (<span lang="hi">पन्ना</span>, Hindi for “page”, and also the word for emerald, which is why everything about it is green) is a free set of PDF tools from <a href="https://testoza.com/">TestoZa</a>, the online test maker for teachers. It lives at ${tool(HUB, 'pdf.testoza.com')}. There’s no sign-up, no watermark and nothing to install, and your file never leaves your device, because all the work happens inside your browser.</p>
<p>The editor does the part that white-box editors skip. It reads the text that’s actually in the PDF, writes your change with the font embedded in the document, and <mark class="wbx-mark">takes the old words out of the file</mark>. That’s the difference in the demo above.</p>
<p>The rest of this guide goes through every tool, big and small, explains what happens inside the file when you press Download, and compares Panna with Smallpdf, iLovePDF, Sejda, Adobe Acrobat and PDF24. If you’d rather just try it, the editor is one click away.</p>
${tryIt(EDIT, 'Open the free PDF editor', 'Works in your browser. Nothing is uploaded.')}`,
        },
    ],

    sections: [
        {
            id: 'at-a-glance',
            title: 'Panna at a glance',
            blocks: [
                {
                    type: 'html',
                    html: h`
<p>If you’re deciding whether to read on, here’s the short version.</p>
<div class="wbx-table"><table class="wbx-facts"><tbody>
<tr><th scope="row">What it is</th><td>A set of free PDF tools that run in your browser</td></tr>
<tr><th scope="row">Where</th><td>${tool(HUB, 'pdf.testoza.com')}</td></tr>
<tr><th scope="row">Price</th><td>Free</td></tr>
<tr><th scope="row">Account</th><td>Not needed</td></tr>
<tr><th scope="row">Watermark</th><td>None</td></tr>
<tr><th scope="row">Privacy</th><td>Files are processed on your device and never uploaded</td></tr>
<tr><th scope="row">Languages</th><td>English and Hindi (Devanagari)</td></tr>
<tr><th scope="row">Works on</th><td>Android, iPhone, Windows, Mac and Linux, in any modern browser</td></tr>
<tr><th scope="row">Made by</th><td>TestoZa Educational Systems, Chennai, India</td></tr>
</tbody></table></div>
<p>There are four tools today.</p>
<div class="wbx-table"><table><thead><tr><th scope="col">Tool</th><th scope="col">Link</th><th scope="col">What it’s for</th></tr></thead><tbody>
<tr><th scope="row">Edit PDF</th><td>${tool(EDIT, 'pdf.testoza.com/edit-pdf')}</td><td>Change existing text in its own font, erase, add text, sign, highlight, draw, insert images and organise pages</td></tr>
<tr><th scope="row">Edit Hindi PDF</th><td>${tool(HINDI, 'pdf.testoza.com/edit-hindi-pdf')}</td><td>The same editor, with a bilingual page and advice for Hindi documents</td></tr>
<tr><th scope="row">LaTeX to PDF</th><td>${tool(LATEX, 'pdf.testoza.com/latex-to-pdf')}</td><td>Turn LaTeX documents, Markdown and maths into a clean, paged PDF</td></tr>
<tr><th scope="row">ChatGPT to PDF</th><td>${tool(CHATGPT, 'pdf.testoza.com/chatgpt-to-pdf')}</td><td>Save answers from ChatGPT, Gemini, Claude and other AI chats as a PDF, maths included</td></tr>
</tbody></table></div>
<p>Merge, split, compress and PDF to Word are listed on the site as the next tools in line.</p>`,
                },
            ],
        },
        {
            id: 'editing-text',
            title: 'Editing text in the document’s own font',
            tocLabel: 'Editing text',
            blocks: [
                {
                    type: 'html',
                    html: h`
<p class="lede">Open ${tool(EDIT, 'pdf.testoza.com/edit-pdf')}, drop a PDF on the page or tap <strong>Choose PDF</strong>, and the editor opens full screen.</p>
<p>The file name sits at the top, and you can click it to rename your download. Next to it are undo and redo, zoom, find and replace, and a single green <strong>Download PDF</strong> button. Every tool in the toolbar has a label, so nothing is buried in a menu, and page thumbnails run down the left side.</p>
${shot('edit-pdf', 'The Panna PDF editor with a certificate open. A paragraph is being edited, and the font menu above it reads Original — Calibri.', 'Mid-edit. The font menu reads “Original — Calibri”, so this paragraph is being written in the PDF’s own embedded font.')}
<h3>Click, type, done</h3>
<p>Click any line and a text box opens exactly on top of it, at the same size and position, in a matching font. Type your change. Press <kbd>Enter</kbd> to finish a single line, or <kbd>Ctrl</kbd> <kbd>Enter</kbd> for a paragraph, where Enter gives you a new line instead.</p>
<p>When you finish, Panna writes your words into the PDF using the font that’s already embedded in it. It doesn’t reach for something that looks similar. It uses the actual font.</p>
<h3>Honest about missing letters</h3>
<p>To keep files small, most PDFs only carry the letters they actually use. A certificate might hold a font with a few dozen characters in it and nothing more. Type a capital V into a document that never had one and Panna tells you while you’re still typing, with a note like <em>“Not in this PDF’s font: V → Times”</em>. It then draws only that V in the closest matching font and leaves everything else in the original. Most editors switch fonts quietly and leave you to spot it later.</p>
<h3>Paragraphs that reflow, tables that stay put</h3>
<p>Change a word in the middle of a paragraph and the lines rewrap inside the original width, starting from the line you changed. The lines above it are left exactly as they were, byte for byte, and <mark class="wbx-mark">justified text stays justified</mark>.</p>
<p>Tables get the same care. A common failure in online editors is treating a whole column of a form as one text box, so fixing one cell nudges all the others. Panna splits text wherever there’s a wide gap, which keeps “Name of Student”, the colon and “Rahul” as three separate pieces, and it only joins lines into a paragraph when there’s clear evidence that the text wraps.</p>
<h3>Moving through a document quickly</h3>
<p><kbd>Tab</kbd> jumps to the next piece of text, even when it’s on the next page. <kbd>Shift</kbd> <kbd>Tab</kbd> goes back, and <kbd>Esc</kbd> cancels.</p>
<p>While a text box is open, a formatting bar sits above it. The font menu lists the original font first, then any other font already used in the PDF, then six standard families: Helvetica (Arial), Times New Roman, Courier, Noto Sans, Noto Serif and Noto Sans Devanagari. You also get size, bold and italic, five colour swatches plus a custom colour picker, left, centre, right and justified alignment, a button that restores the original text, and delete.</p>
<p>A few font types can’t be re-encoded at all, Type3 fonts being the usual example. Panna tells you so up front, then erases the old text and types yours in a similar font.</p>
<h3 id="moving-text">Moving text with smart guides</h3>
<p>This is one of our newer additions, and it borrows an idea from design software. Drag any line or paragraph and rose-coloured guides appear. The text snaps to the edges, centres and baselines of other text on the page, to images and shapes you’ve added, to the centre of the page, to the centre of the table cell it’s sitting in (Panna finds cells from the page’s own ruling lines), and back to where it started, which shows up as a dashed line. A small read-out tells you how far you’ve moved it, in millimetres.</p>
<p>Hold <kbd>Shift</kbd> to keep the move perfectly straight, hold <kbd>Alt</kbd> to turn snapping off, and press <kbd>Esc</kbd> to cancel. The arrow keys nudge the selected text, image or shape by one point, or by ten with Shift held down. A floating bar offers the same nudges as buttons, along with <em>Edit text</em> and <em>Back to original position</em>.</p>
<p>Each open text box also has a handle on either side for changing the width the text wraps to. Make it wider to fit more words on a line, or narrower so a long entry wraps neatly inside its table column. The box keeps the edge the text was aligned to, so a right-aligned amount grows to the left, the way it should. And when you move text without changing it, every original character is redrawn at its old position plus the offset, with the same line breaks and spacing.</p>
${tryIt(EDIT, 'Edit a PDF now', 'Free, no sign-up, and the file stays on your device.')}`,
                },
            ],
        },
        {
            id: 'toolbar',
            title: 'Every other tool in the editor',
            tocLabel: 'The rest of the toolbar',
            blocks: [
                {
                    type: 'html',
                    html: h`
<p>Changing existing text is the headline feature, but most jobs need a little more than that. Here’s the rest of the toolbar, roughly in the order it appears.</p>
<h3>Add text <kbd>T</kbd></h3>
<p>Click anywhere to place a new text box, pick a font, size and colour, and drag its handle if you want the text to wrap. It works in English, Hindi or both.</p>
<h3>Erase <kbd>E</kbd></h3>
<p>Drag a box over the words you want gone. They’re removed from the page’s content itself, and whatever was behind them, whether lines, colours or images, stays where it was.</p>
<p>When you download, a clean-up pass also deletes every object the file no longer uses, so <mark class="wbx-mark">the erased words can’t be copied, searched or lifted out from under a box</mark>. There’s no box to lift. Erased areas stay selectable in the editor (hover to see a dashed outline), so you can delete an erase to bring the text back, or switch on White-out for that area to paint over images and lines as well.</p>
<h3>White-out <kbd>W</kbd></h3>
<p>White-out covers an area with the page’s own background colour. Panna samples the colour from the page, so it blends into cream, grey or tinted paper, not only white. Any text underneath a white-out is removed for real too. It’s mainly meant for scanned pages and pictures, which don’t have a text layer: cover the old words, then type on top with Add text.</p>
<h3>Highlight <kbd>H</kbd></h3>
<p>Drag across a sentence and the highlight snaps to the actual lines of text, then blends in the way a real marker does, so the words stay sharp. Yellow, green, blue and pink are one click away, and any other colour is available from the picker.</p>
<h3>Draw <kbd>D</kbd></h3>
<p>Freehand ink with a little smoothing applied as you draw. There are four ink colours plus a custom one, and the width slider shows a live preview of how thick the stroke will look at your current zoom.</p>
<h3>Shapes</h3>
<p>Rectangle, ellipse, line and arrow. Drag to draw, pick a stroke colour and width, tick <strong>Filled</strong> for rectangles and ellipses, and change the opacity once they’re placed.</p>
<h3>Image</h3>
<p>Insert a photo, logo or stamp in PNG, JPEG, WebP or GIF. It lands in the middle of the page you’re looking at, and you can move it, resize it, rotate it in 90-degree steps and change its opacity. Big photos are scaled down to 2,400 pixels on the longest side, so the finished PDF stays light.</p>
<h3>Sign</h3>
<p>The signature dialog gives you three options. You can draw with a finger, stylus or mouse. You can type your name and pick one of four handwriting styles: Dancing Script, Great Vibes, Caveat or Sacramento. Or you can upload a photo of your signature on white paper, and Panna removes the paper background for you.</p>
<p>Ink comes in black, blue or green. Your last four signatures are remembered on your device only, ready for one-click reuse, and you can remove any of them.</p>
<h3>Find and replace <kbd>Ctrl F</kbd></h3>
<p>Search every page at once, with options for matching case and whole words, then replace one match or all of them. Replacements are ordinary text edits, so they keep the PDF’s own font and formatting, and a bold name stays bold. If some matches sit in text that can’t be edited, Panna tells you how many it skipped rather than failing quietly. It’s the quickest way to fix a name, a date, a class or a roll number across a whole document.</p>
<h3>Pages</h3>
<p>The thumbnail panel lets you drag pages into a new order (or use Move up and Move down), rotate them left or right, duplicate a page, insert a blank page that automatically matches the size of the page next to it, or delete one. Pages you’ve changed get a small green dot, and every page action can be undone.</p>
<h3>The everyday comforts</h3>
<p>Undo and redo go back up to 100 steps. Zoom runs from 25% to 500%, fits the page width by default and responds to <kbd>Ctrl</kbd> plus the mouse wheel.</p>
<p>About a second after every change, your work is saved in your browser. Close the tab by accident and a <strong>Continue editing</strong> card will be waiting for you with the file name, the number of changes and when you last worked on it. Files over 60 MB aren’t autosaved, to stay within phone storage limits. If you try to leave with unsaved changes, the browser warns you first.</p>
<p>Downloading is one click, or <kbd>Ctrl</kbd> <kbd>S</kbd>, with no export wizard, sign-up wall or watermark. On a phone, the toolbar scrolls sideways and a page counter floats at the bottom of the screen.</p>
<h3>Keyboard shortcuts</h3>
<div class="wbx-table"><table class="wbx-keys"><thead><tr><th scope="col">Shortcut</th><th scope="col">What it does</th></tr></thead><tbody>
<tr><td><kbd>V</kbd> <kbd>T</kbd> <kbd>E</kbd> <kbd>W</kbd> <kbd>H</kbd> <kbd>D</kbd></td><td>Edit text, Add text, Erase, White-out, Highlight, Draw</td></tr>
<tr><td><kbd>Ctrl</kbd> <kbd>S</kbd></td><td>Download</td></tr>
<tr><td><kbd>Ctrl</kbd> <kbd>F</kbd></td><td>Find and replace</td></tr>
<tr><td><kbd>Ctrl</kbd> <kbd>Z</kbd> / <kbd>Ctrl</kbd> <kbd>Y</kbd></td><td>Undo / redo (<kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>Z</kbd> also redoes)</td></tr>
<tr><td><kbd>Ctrl</kbd> <kbd>+</kbd> / <kbd>Ctrl</kbd> <kbd>−</kbd> / <kbd>Ctrl</kbd> <kbd>0</kbd></td><td>Zoom in, zoom out, fit to width</td></tr>
<tr><td><kbd>Tab</kbd> / <kbd>Shift</kbd> <kbd>Tab</kbd></td><td>Next or previous text, while editing</td></tr>
<tr><td><kbd>Enter</kbd> / <kbd>Ctrl</kbd> <kbd>Enter</kbd></td><td>Finish a line, finish a paragraph</td></tr>
<tr><td><kbd>←</kbd> <kbd>↑</kbd> <kbd>↓</kbd> <kbd>→</kbd></td><td>Nudge the selection by 1 pt (10 pt with Shift)</td></tr>
<tr><td><kbd>Shift</kbd> / <kbd>Alt</kbd> while dragging</td><td>Move in a straight line, move without snapping</td></tr>
<tr><td><kbd>Delete</kbd></td><td>Delete the selected object</td></tr>
<tr><td><kbd>Esc</kbd></td><td>Cancel, deselect, or cancel a drag</td></tr>
</tbody></table></div>
<p class="wbx-note">On a Mac, use ⌘ wherever it says Ctrl.</p>`,
                },
            ],
        },
        {
            id: 'details',
            title: 'Twelve small details',
            blocks: [
                {
                    type: 'html',
                    html: h`
<p>Good tools are mostly small decisions. Here are a dozen you might never notice, and would probably miss.</p>
<ol class="wbx-details wide">
<li><b>White-out matches the paper.</b> It samples the page’s colour, so it disappears into cream certificates and grey forms, not just white paper.</li>
<li><b>Highlights follow the lines.</b> They look like a careful marker stroke rather than a rectangle dropped on the page.</li>
<li><b>A preview for stroke width.</b> The slider shows the line exactly as thick as it will appear on the page at your zoom.</li>
<li><b>Blank pages fit in.</b> A new blank page takes the size of the page beside it, so the document stays uniform.</li>
<li><b>Green dots on edited pages.</b> The thumbnails show at a glance where you’ve made changes.</li>
<li><b>Clean signature uploads.</b> A photographed signature loses its paper background automatically, no photo app needed.</li>
<li><b>Replace keeps formatting.</b> A bold name stays bold after find and replace.</li>
<li><b>A way back.</b> One button returns a moved line exactly where it started.</li>
<li><b>A toolbar that moves aside.</b> When your text is near the bottom of the screen, the selection bar jumps to the top so it never covers the rows you’re lining up with.</li>
<li><b>Passwords are never saved.</b> Even autosave asks for the password again next time.</li>
<li><b>Money isn’t maths.</b> In the maths converter, “$5 and $10” stays as money instead of turning into a formula.</li>
<li><b>File names from titles.</b> “Worksheet 3: Limits and Continuity” downloads as <code>Worksheet-3-Limits-and-Continuity.pdf</code>, and Hindi titles keep their Hindi letters.</li>
</ol>`,
                },
            ],
        },
        {
            id: 'hindi',
            title: 'Hindi PDFs, done properly',
            tocLabel: 'Hindi PDFs',
            blocks: [
                {
                    type: 'html',
                    html: h`
<p class="lede">${tool(HINDI, 'pdf.testoza.com/edit-hindi-pdf')} is the same editor with a bilingual page and advice for people editing Hindi documents such as application forms, certificates, circulars and question papers.</p>
<h3>Why Hindi breaks in most editors</h3>
<p>Hindi isn’t written one letter after another in a straight line. These four examples show what an editor has to get right.</p>
<div class="wbx-specimens wide">
<figure class="wbx-spec"><span class="wbx-glyph" lang="hi">कि</span><figcaption>The <span lang="hi">ि</span> matra is typed after <span lang="hi">क</span> but drawn before it.</figcaption></figure>
<figure class="wbx-spec"><span class="wbx-glyph" lang="hi">क्ष</span><figcaption><span lang="hi">क</span> + <span lang="hi">्</span> + <span lang="hi">ष</span> join into a single shape.</figcaption></figure>
<figure class="wbx-spec"><span class="wbx-glyph" lang="hi">ज्ञ</span><figcaption><span lang="hi">ज</span> + <span lang="hi">्</span> + <span lang="hi">ञ</span> become one conjunct.</figcaption></figure>
<figure class="wbx-spec"><span class="wbx-glyph" lang="hi">धर्म</span><figcaption>The reph (<span lang="hi">र्</span>) sits on top of <span lang="hi">म</span>.</figcaption></figure>
</div>
<p class="wbx-note">Set in Noto Sans Devanagari, the font Panna uses for new Hindi text.</p>
<p>Putting all of that in the right place is called text shaping. Editors that skip it produce matras in the wrong spot, broken conjuncts, or Hindi that can no longer be searched or copied.</p>
<h3>What Panna does differently</h3>
<p>Panna shapes every Hindi word using the OpenType rules of Noto Sans Devanagari, an open-source Unicode font designed for the Devanagari script. It also stores the real Hindi text alongside the shapes it draws, so the page looks right, and <mark class="wbx-mark">search, copy-paste and screen readers still get proper Hindi</mark>.</p>
<p>One detail is worth knowing. New Hindi text is always set in Noto Sans Devanagari, because the Hindi fonts embedded inside PDFs usually can’t be reshaped for new words. Rather than break your matras, Panna uses Noto and tells you with a note while you type. Syllables you don’t change keep their original shapes, and Hindi and English can share the same page without any trouble.</p>
${shot('edit-hindi-pdf', 'Editing a Hindi online application form in Panna. A note under the format bar lists the characters that will be set in Noto Sans Devanagari.', 'Editing a Hindi application form. The amber note lists the characters that will be set in Noto Sans Devanagari, before you finish typing.')}
<h3>Which Hindi PDFs can you edit?</h3>
<div class="wbx-table"><table><thead><tr><th scope="col">Type of Hindi PDF</th><th scope="col">What to do</th><th scope="col">Why</th></tr></thead><tbody>
<tr><th scope="row">Unicode Hindi (Mangal, Nirmala UI, Noto, Kokila; PDFs from Word, Google Docs or Chrome)</th><td class="wbx-yes">Edit in place</td><td>The text is stored as real Hindi letters, so Panna can change it and keep it searchable.</td></tr>
<tr><th scope="row">Old non-Unicode fonts (Kruti Dev, DevLys, Chanakya)</th><td><strong>Erase and retype</strong></td><td>These fonts store Hindi as English letters, so the text looks jumbled when edited. Erase the line and retype it with Add text, and it’s saved as proper Unicode Hindi.</td></tr>
<tr><th scope="row">Scanned documents and photos</th><td><strong>White-out and type</strong></td><td>A scan is a picture with no text layer.</td></tr>
</tbody></table></div>
<h3>Typing in Hindi</h3>
<p>On an Android phone or an iPhone, add Hindi to Gboard or the iOS keyboard and type phonetically, so “namaste” becomes <span lang="hi">नमस्ते</span>. On Windows, add Hindi under Settings → Time &amp; language → Language &amp; region, then switch keyboards with <kbd>Win</kbd> <kbd>Space</kbd>. Or write the text in Google Docs or WhatsApp, copy it, and paste it into the PDF.</p>
${tryIt(HINDI, 'Edit a Hindi PDF', '<span lang="hi">हिंदी PDF एडिट करें</span>, free, with nothing uploaded.')}`,
                },
            ],
        },
        {
            id: 'maths',
            title: 'ChatGPT, Gemini and LaTeX maths, as a clean PDF',
            tocLabel: 'ChatGPT and LaTeX to PDF',
            blocks: [
                {
                    type: 'html',
                    html: h`
<p class="lede">Ask ChatGPT to explain the quadratic formula and the answer looks lovely on screen. Keeping it is another matter.</p>
<p>Copy it and you get code like <code>\frac{-b \pm \sqrt{b^2-4ac}}{2a}</code>. Print the chat and formulas can be sliced in half at page breaks while the layout falls apart. Select the answer with your mouse and paste it somewhere else, and every formula shows up several times over, as gibberish like “x2x^2”.</p>
<p>${tool(LATEX, 'pdf.testoza.com/latex-to-pdf')} and ${tool(CHATGPT, 'pdf.testoza.com/chatgpt-to-pdf')} solve this. They share one engine, and the two pages are simply written for different readers: one for people who work in LaTeX, and one for anyone saving AI answers.</p>
${shot('chatgpt-to-pdf', 'Panna ChatGPT to PDF: a ChatGPT answer pasted as LaTeX code on the left, and the same answer typeset on an A4 page on the right, with a formula and a table.', 'A ChatGPT answer pasted exactly as it was copied (left), laid out on a real A4 page (right).')}
<h3>What it understands</h3>
<p>It reads ChatGPT’s <code>\( … \)</code> and <code>\[ … \]</code> notation, including aligned equations and tables with maths in them. It reads Gemini’s <code>$ … $</code> and <code>$$ … $$</code>, even in the middle of a sentence. It handles Claude’s answers and ordinary Markdown: headings, bold and italic, lists, tables, code blocks, links, task lists and block quotes.</p>
<p>Whole LaTeX documents work too. That covers <code>\documentclass</code> and the preamble; <code>\title</code>, <code>\author</code>, <code>\date</code> and <code>\maketitle</code>; sections down to <code>\paragraph</code>; itemize, enumerate and description lists; <code>tabular</code> with <code>\multicolumn</code>; quote and center; <code>\textbf</code>, <code>\textit</code>, <code>\emph</code>, <code>\texttt</code> and <code>\underline</code>; <code>\url</code>, <code>\href</code> and <code>\footnote</code>; and numbered environments such as equation and align, with their equation numbers.</p>
<p>Simple macros defined with <code>\newcommand</code>, <code>\renewcommand</code>, <code>\def</code> or <code>\DeclareMathOperator</code> are picked up. Chemistry written as <code>\ce{…}</code> (mhchem) is typeset even without dollar signs. Hindi works as well, including Hindi inside a formula such as <code>\text{<span lang="hi">आधार</span>}</code>. And <code>\newpage</code>, <code>\pagebreak</code> or <code>\clearpage</code> start a new page.</p>
<h3>What it fixes for you</h3>
<p>Copying damages maths in predictable ways, so Panna repairs the usual problems and shows each repair as a small “Fixed” chip under the text box.</p>
<ul>
<li>Lost backslashes are put back, so <code>[ … ]</code> becomes <code>\[ … \]</code> again and <code>( x^2 )</code> becomes <code>\( x^2 \)</code>.</li>
<li>Doubled backslashes from JSON, such as <code>\\frac</code>, are halved.</li>
<li>Bare LaTeX, like a line reading <code>\frac{a}{b} = c</code> or “where \alpha is…” in the middle of a sentence, is wrapped as maths.</li>
<li>LaTeX inside a <code>&#96;&#96;&#96;latex</code> code block is unwrapped and typeset.</li>
<li>A lone dollar sign, as in “costs $5 and $10”, is left alone as money.</li>
<li>Garbled selection copies are rebuilt. When you select an answer in ChatGPT, Gemini, Claude or even Wikipedia, your clipboard also carries a richer version of the page. Panna reads that, recovers the original TeX for every formula, and rebuilds clean Markdown. It understands KaTeX, MathJax and Wikipedia’s maths, and it can convert MathML from MathJax 3 or Microsoft Word back into TeX.</li>
<li>Formulas that really are broken are counted, and a notice such as “2 formulas have errors — show” takes you straight to the first one.</li>
</ul>
<h3>Pages you can check before you download</h3>
<p>You choose A4 or Letter; narrow (12.7 mm), normal (20 mm) or wide (25.4 mm) margins; a serif or sans font; 11, 12 or 13 pt text; and whether to print page numbers, which appear as “1 / 4”. The preview shows real pages at true width, with dashed “Page N” markers exactly where the PDF will break, plus a page count. Formulas and tables that are too wide are shrunk to fit the page, down to half size at most, instead of running off the edge. The title box starts with your first heading and becomes the PDF’s title and file name.</p>
${shot('latex-to-pdf', 'Panna LaTeX to PDF: a full LaTeX worksheet with sections, a numbered list of limits, two numbered identities and a small table, typeset on an A4 page.', h`A complete LaTeX document, from \documentclass to a tabular, with numbered equations on the right.`)}
<h3>What you get</h3>
<p><strong>Download PDF</strong> (or <kbd>Ctrl</kbd> <kbd>S</kbd>) produces a real vector PDF, usually in about a second. It isn’t a screenshot, and there’s no print dialog. The text is selectable and searchable in the same fonts as the preview, it stays sharp at any zoom, equation numbers and clickable links survive, headings become bookmarks, and the document’s language is set to Hindi or English so screen readers and search engines read it correctly. Even emoji make it through, drawn as crisp images.</p>
<p>If the document needs a logo, a signature or a last-minute fix, <strong>Edit as PDF</strong> generates it and opens it straight in the Panna editor.</p>
<p>Six samples are built in if you want to see what it can do: a ChatGPT answer, a Gemini answer, a copy with broken maths, a LaTeX document, a Hindi worksheet and a chemistry sheet. There’s a Paste button that reads rich clipboard content where the browser allows it, a Clear button you can undo, and your draft and settings are saved on your device. On phones the page switches to Write and Pages tabs, with a Download bar that stays in reach.</p>
<p>To save a whole ChatGPT conversation, paste the answers one below another, add a heading above each, and type <code>\newpage</code> on its own line wherever you want a new page to begin.</p>
<h3>When to use something else</h3>
<p>For a thesis with TikZ figures, a bibliography and custom packages, a full LaTeX system is still the right choice, whether that’s Overleaf (which needs a free account) or TeX installed on your computer. Panna is for the everyday case: an AI answer, a worksheet, a problem set, a page of notes. Paste it, check the pages, download.</p>
${tryIt(CHATGPT, 'Turn a ChatGPT answer into a PDF', 'Or paste a LaTeX document at pdf.testoza.com/latex-to-pdf.')}`,
                },
            ],
        },
        {
            id: 'under-the-hood',
            title: 'What happens when you press Download',
            tocLabel: 'Under the hood',
            blocks: [
                {
                    type: 'html',
                    html: h`
<p class="lede">Why can Panna do things that white-box editors can’t? Because it doesn’t treat your PDF as a picture.</p>
<p>A PDF page is a list of drawing instructions. A line of text on a certificate looks roughly like this inside the file:</p>
<pre class="wbx-code"><code><span class="op">BT</span>                                 <span class="c">% start a block of text</span>
/F1 11 <span class="op">Tf</span>                          <span class="c">% font F1 (embedded in the file), 11 pt</span>
72 700 <span class="op">Td</span>                          <span class="c">% move to this point on the page</span>
(Certificate of Participation) <span class="op">Tj</span>  <span class="c">% draw these characters</span>
<span class="op">ET</span>                                 <span class="c">% end the block</span></code></pre>
<p>Panna has its own PDF engine, built on open-source foundations (Mozilla’s pdf.js, pdf-lib and fontkit), and it reads and rewrites these instructions directly, in your browser. It works in seven steps.</p>
<ol class="wbx-steps">
<li><b>Read.</b> It runs the page the way a PDF viewer does and records every character: its position, font, size, colour and angle.</li>
<li><b>Understand the layout.</b> Characters are grouped into lines and blocks. Wide gaps split lines, which keeps table cells apart, and lines only become a paragraph when there’s evidence the text wraps. Each block’s alignment is detected as well.</li>
<li><b>Decode the fonts.</b> It builds a map from letters back to each font’s internal codes and notes exactly which characters each font subset contains. That’s how it knows your V is missing.</li>
<li><b>Compare.</b> When you edit, it compares the old and new text with the Myers diff algorithm, the same family of algorithm that powers <code>git diff</code>.</li>
<li><b>Plan.</b> Unchanged characters are redrawn from their original glyph codes, so they come out pixel-identical. New characters use the original font wherever it has them, and missing ones fall back to a standard font of the same style, then Noto Serif or Sans, then Noto Sans. Paragraphs reflow from the first changed line.</li>
<li><b>Rewrite only what changed.</b> Removed characters are replaced by an equal amount of spacing, so nothing else on the line moves. Anything shared between pages, such as a letterhead drawn on every page, is copied first, so an edit on page 3 doesn’t leak onto page 7.</li>
<li><b>Clean up.</b> Before saving, a mark-and-sweep clean-up deletes every object the document no longer uses: old text, replaced fonts, unused images. <mark class="wbx-mark">This step is what makes erasing real.</mark> The file is then saved with compressed object streams to keep it small.</li>
</ol>
<p>The preview you see while editing isn’t a simulation either. Each edited page is rebuilt as a real one-page PDF by the same code that produces your download, and then drawn on screen. If it looks right in the editor, it’s right in the file.</p>
<h3>Security and speed</h3>
<p>Password-protected PDFs are opened by Panna’s own implementation of the PDF standard security handler. It covers revisions 2 to 6 (RC4, AES-128 and AES-256) and was checked against the official FIPS and RFC test vectors. Pages are drawn by pdf.js, the engine behind Firefox’s built-in PDF viewer, set up so that it never evaluates code from the file. We also chose a pdf.js build that supports older Android phones, because plenty of people still use them.</p>
<p>The heavy parts load only when they’re needed. The PDF engine downloads when you open a file, fonts download only when a character needs them, and only the pages near your screen are drawn.</p>`,
                },
            ],
        },
        {
            id: 'privacy',
            title: 'Why your file never leaves your device',
            tocLabel: 'Privacy',
            blocks: [
                {
                    type: 'html',
                    html: h`
<p>Think about the documents people edit: marksheets, certificates, ID proofs, offer letters, bank forms, medical reports. With most online editors, step one is uploading that file to someone else’s server. Deleting it an hour later is better than keeping it. Never receiving it is better still.</p>
<p>With Panna, your PDF is opened, edited and saved on your own device. If it has a password, the password is used only in your browser and is never stored. Signatures are remembered only on your device, and you can remove them whenever you like. Autosaved work lives only in your browser, and <strong>Discard</strong> deletes it.</p>
<p>To be fully transparent about what we do see: like almost every website, pdf.testoza.com counts visits and downloads with our own first-party analytics. A download is logged with the tool’s name and the page count, nothing more, and browsers that send the Global Privacy Control signal aren’t counted at all. We never receive your document or anything in it.</p>
<h3>Free, and no catch</h3>
<p>There’s no account, no watermark, no trial that runs out and, as things stand, no daily limit. Because your device does the processing, there’s no per-file server bill for us to pass on. After a download we do make one suggestion: if you’re a teacher, you can turn a PDF of questions into an online test on <a href="https://testoza.com/pdf-to-quiz">TestoZa</a>. That’s the whole catch.</p>`,
                },
            ],
        },
        {
            id: 'compare',
            title: 'How Panna compares',
            blocks: [
                {
                    type: 'html',
                    html: h`
<p>Start with what most free editors actually do to your file, and the difference is easy to see.</p>
<div class="wbx-table"><table class="wbx-compare"><thead><tr><th scope="col">What happens to your document</th><th scope="col" class="wbx-hl">Panna</th><th scope="col">Typical online editor</th></tr></thead><tbody>
<tr><th scope="row">Edited text uses the PDF’s own font</th><td class="wbx-hl wbx-yes">Yes</td><td>Often retyped in Arial or Helvetica</td></tr>
<tr><th scope="row">Erased text is deleted from the file</th><td class="wbx-hl wbx-yes">Yes</td><td>Often covered with a white box</td></tr>
<tr><th scope="row">Table cells edit independently</th><td class="wbx-hl wbx-yes">Yes</td><td>Often one box per column</td></tr>
<tr><th scope="row">Hindi shaped correctly</th><td class="wbx-hl wbx-yes">Yes</td><td>Matras often break</td></tr>
<tr><th scope="row">Find and replace across pages</th><td class="wbx-hl wbx-yes">Yes</td><td>Not always available</td></tr>
<tr><th scope="row">Download without an account</th><td class="wbx-hl wbx-yes">Yes</td><td>Sign-up or paywall is common</td></tr>
<tr><th scope="row">File stays on your device</th><td class="wbx-hl wbx-yes">Yes</td><td>Uploaded to a server</td></tr>
<tr><th scope="row">Watermark on free downloads</th><td class="wbx-hl wbx-yes">None</td><td>Common</td></tr>
</tbody></table></div>
<h3>Panna and the tools you already know</h3>
<p class="wbx-note">We took these details from each company’s own website in September 2026. Plans change often, so check before you rely on them. Sources are listed at the end of the article.</p>
<div class="wbx-table wide"><table class="wbx-compare wbx-compare--wide"><thead><tr><th scope="col"><span class="wbx-sr">Question</span></th><th scope="col" class="wbx-hl">Panna</th><th scope="col">Smallpdf</th><th scope="col">iLovePDF</th><th scope="col">Sejda (web)</th><th scope="col">Adobe Acrobat (online)</th><th scope="col">PDF24 (online)</th></tr></thead><tbody>
<tr><th scope="row">Edit existing text</th><td class="wbx-hl wbx-yes">Yes, in the PDF’s own embedded font</td><td>Pro plan (7-day free trial)</td><td>Yes</td><td>Yes</td><td>Paid plan (Acrobat Pro)</td><td class="wbx-no">No, it adds new content on top</td></tr>
<tr><th scope="row">Free usage</th><td class="wbx-hl">Free, with no task quota</td><td>2 tasks per day</td><td>Limited free tasks, then Premium</td><td>3 tasks per hour, up to 200 pages or 50 MB</td><td>Free annotation tools; sign in to download</td><td>Free, no limits</td></tr>
<tr><th scope="row">Where your file goes</th><td class="wbx-hl wbx-yes">Stays in your browser</td><td>Uploaded, deleted after 1 hour</td><td>Uploaded, deleted after 2 hours</td><td>Uploaded, deleted after 2 hours</td><td>Processed in Adobe’s cloud</td><td>Uploaded, removed after a short time</td></tr>
</tbody></table></div>
<div class="wbx-two wide">
<div>
<h3>Where Panna stands out</h3>
<ul>
<li><strong>Same-font edits, with honesty.</strong> Panna writes with the document’s own embedded font and tells you exactly which characters, if any, had to come from another font.</li>
<li><strong>Nothing to upload.</strong> For sensitive documents, a service that never receives the file is the safest kind.</li>
<li><strong>Real erasure for everyone.</strong> Deleted text is gone from the file. Elsewhere, true removal usually sits behind a separate “redact” feature.</li>
<li><strong>Hindi.</strong> Many editors still struggle with Devanagari. Panna gets matras and conjuncts right and keeps the text searchable.</li>
<li><strong>Built for AI maths.</strong> The converter understands how ChatGPT, Gemini and Claude write formulas, and repairs what copying breaks.</li>
</ul>
</div>
<div>
<h3>Where others are ahead, for now</h3>
<ul>
<li><strong>Range of tools.</strong> Smallpdf, iLovePDF, Sejda and PDF24 offer dozens: merge, split, compress, and conversions to and from Word, Excel and images. Panna has four today, with merge, split, compress and PDF to Word announced as next.</li>
<li><strong>Scanned documents.</strong> Several competitors offer OCR, sometimes on paid plans. Panna doesn’t have OCR yet.</li>
<li><strong>Cloud workflows.</strong> Storage, team sharing and e-signature requests are strengths of platforms such as Adobe and Smallpdf.</li>
<li><strong>Very heavy files on low-end phones.</strong> Server-based tools don’t depend on the power of your device. Panna does.</li>
</ul>
</div>
</div>
<h3>For maths: Panna, Overleaf, or printing the chat?</h3>
<div class="wbx-table"><table class="wbx-compare"><thead><tr><th scope="col"><span class="wbx-sr">Question</span></th><th scope="col" class="wbx-hl">Panna</th><th scope="col">Overleaf</th><th scope="col">Printing the chat page</th></tr></thead><tbody>
<tr><th scope="row">Account needed</th><td class="wbx-hl">No</td><td>Yes (a free account works)</td><td>No</td></tr>
<tr><th scope="row">Takes AI answers as they are</th><td class="wbx-hl wbx-yes">Yes, and repairs them</td><td>Needs a proper LaTeX document</td><td>Yes</td></tr>
<tr><th scope="row">Full LaTeX packages (TikZ, bibliographies)</th><td class="wbx-hl wbx-no">No</td><td>Yes</td><td>Not applicable</td></tr>
<tr><th scope="row">Page breaks</th><td class="wbx-hl">Previewed before download</td><td>Handled by LaTeX</td><td>Formulas can be cut in half</td></tr>
<tr><th scope="row">Best for</th><td class="wbx-hl">Worksheets, notes, AI answers</td><td>Theses, papers, large projects</td><td>Quick personal copies</td></tr>
</tbody></table></div>`,
                },
            ],
        },
        {
            id: 'who',
            title: 'Who it’s for',
            blocks: [
                {
                    type: 'html',
                    html: h`
<div class="wbx-people wide">
<div><h3>Teachers and schools</h3><p>Fix a date across sixty certificates at once with find and replace. Correct a typo in a circular or a question paper without changing its font. Add the school logo and the principal’s signature. Turn ChatGPT or Gemini explanations into printable worksheets, then use Edit as PDF to brand them.</p></div>
<div><h3>Students</h3><p>Fix mistakes in your own resume or project report, sign and submit forms, keep AI-explained solutions as clean PDFs for revision, and write LaTeX assignments without installing anything.</p></div>
<div><h3>Job seekers and applicants</h3><p>Fill in details, add a photo, sign, and highlight what matters, without handing your documents to a server.</p></div>
<div><h3>Offices and small businesses</h3><p>Update a price in a quotation, correct an address on an invoice, add a stamp and signature, reorder pages, or insert a blank page for notes.</p></div>
<div><h3>Hindi-medium users</h3><p>Edit Unicode Hindi forms and documents with correct matras, and retype old Kruti Dev text as proper Unicode.</p></div>
<div><h3>Anyone who values privacy</h3><p>If a document holds your ID number, your marks, your salary or your health records, it shouldn’t have to leave your phone just so you can fix one line.</p></div>
</div>`,
                },
            ],
        },
        {
            id: 'guides',
            title: 'Quick how-to guides',
            tocLabel: 'How-to guides',
            blocks: [
                {
                    type: 'html',
                    html: h`
<div class="wbx-guides wide">
<div class="wbx-guide"><h3>Edit text in a PDF in the same font</h3><ol>
<li>Go to ${tool(EDIT, 'pdf.testoza.com/edit-pdf')} and drop your PDF on the page.</li>
<li>Check that <strong>Edit text</strong> (<kbd>V</kbd>) is selected, then click the line you want to change.</li>
<li>Type your change. If a note mentions characters that aren’t in the PDF’s font, those characters will use the closest match.</li>
<li>Press <kbd>Enter</kbd> (<kbd>Ctrl</kbd> <kbd>Enter</kbd> for a paragraph), or <kbd>Tab</kbd> to move to the next text.</li>
<li>Press <strong>Download PDF</strong> or <kbd>Ctrl</kbd> <kbd>S</kbd>.</li>
</ol></div>
<div class="wbx-guide"><h3>Remove text from a PDF permanently</h3><ol>
<li>Open the PDF and choose <strong>Erase</strong> (<kbd>E</kbd>).</li>
<li>Drag a box over the words you want gone.</li>
<li>Download. The words are deleted from the file and the background stays.</li>
</ol><p class="wbx-note">On a scanned page, use White-out (<kbd>W</kbd>) to cover the area instead, and read the note on scans under <a href="#limits">What Panna can’t do yet</a>.</p></div>
<div class="wbx-guide"><h3>Sign a PDF</h3><ol>
<li>Open the PDF and tap <strong>Sign</strong>.</li>
<li>Draw, type or upload your signature, and pick an ink colour.</li>
<li>Drag the signature into place and resize it.</li>
<li>Download.</li>
</ol></div>
<div class="wbx-guide"><h3>Edit a Hindi PDF</h3><ol>
<li>Go to ${tool(HINDI, 'pdf.testoza.com/edit-hindi-pdf')} and open your file.</li>
<li>Click the Hindi line and type with Gboard or the Windows Hindi keyboard, or paste Hindi text.</li>
<li>Download. Matras and conjuncts are shaped correctly and the text stays searchable.</li>
</ol></div>
<div class="wbx-guide"><h3>Save a ChatGPT answer as a PDF</h3><ol>
<li>In ChatGPT, Gemini or Claude, click the copy button under the answer. Selecting the answer and copying it works too.</li>
<li>Go to ${tool(CHATGPT, 'pdf.testoza.com/chatgpt-to-pdf')} and paste.</li>
<li>Check the pages on the right and pick the paper size, margins, font and text size.</li>
<li>Press <strong>Download PDF</strong>.</li>
</ol></div>
<div class="wbx-guide"><h3>Convert a LaTeX document to PDF</h3><ol>
<li>Go to ${tool(LATEX, 'pdf.testoza.com/latex-to-pdf')}.</li>
<li>Paste your document, from <code>\documentclass</code> to <code>\end{document}</code>.</li>
<li>Look over the “Fixed” chips and any formula errors, then check the page breaks in the preview.</li>
<li>Press <strong>Download PDF</strong>, or <strong>Edit as PDF</strong> to add a logo or signature first.</li>
</ol></div>
</div>`,
                },
            ],
        },
        {
            id: 'limits',
            title: 'What Panna can’t do yet',
            tocLabel: 'Current limits',
            blocks: [
                {
                    type: 'html',
                    html: h`
<p>No tool does everything, and knowing where the edges are saves time. This is where Panna stands today.</p>
<div class="wbx-two wide">
<div>
<h3>In the PDF editor</h3>
<ul>
<li><strong>No OCR yet.</strong> Scanned PDFs are pictures without a text layer, so use White-out and Add text.</li>
<li><strong>White-out on a scan only covers it.</strong> On pages with real text, erased and whited-out words are deleted from the file. On a scanned page, White-out paints over the picture while the original image stays inside the file, so it isn’t a substitute for proper redaction of sensitive scans.</li>
<li><strong>Old Hindi fonts</strong> such as Kruti Dev, DevLys and Chanakya can’t be edited in place. Erase and retype instead.</li>
<li><strong>Some text can’t be edited in place:</strong> vertical text, Type3 fonts and some East Asian fonts. Panna falls back to erasing and retyping where it can, and vertical text can’t be moved.</li>
<li><strong>No automatic hyphenation</strong> when paragraphs reflow.</li>
<li><strong>Superscripts and subscripts</strong> become separate small blocks.</li>
<li><strong>Page thumbnails</strong> show the original pages, not your edits.</li>
<li><strong>No form-filling mode</strong> for interactive PDF forms. Use Add text and Sign instead.</li>
<li><strong>Your device does the work.</strong> A 200-page, 50 MB PDF on a budget phone can be slow, and autosave lives in one browser rather than in a cloud account.</li>
</ul>
</div>
<div>
<h3>In LaTeX and ChatGPT to PDF</h3>
<ul>
<li><strong>No drawing packages</strong> such as TikZ or pgfplots, and only simple <code>\newcommand</code>-style macros.</li>
<li><strong>Copying a formula out of the PDF</strong> gives text in visual order, so a fraction’s denominator may come first, even though the formula looks perfect.</li>
<li><strong>Images from other websites</strong> are skipped if that site blocks cross-site access.</li>
<li><strong>MathML-only pages</strong> are converted on a best-effort basis.</li>
</ul>
</div>
</div>`,
                },
            ],
        },
    ],

    faqs: [
        {
            q: 'Is Panna really free? What’s the catch?',
            a: 'Yes, it’s free. There’s no account, no watermark and no subscription. Because the processing happens on your own device, there’s no per-file server cost for us to recover. TestoZa’s business is its assessment platform for teachers and students, and after a download Panna offers teachers a link to turn a PDF into an online test. That’s all.',
        },
        {
            q: 'Is my PDF uploaded anywhere?',
            a: 'No. It’s opened, edited and saved inside your browser, on your own device.',
        },
        {
            q: 'Will the edited text match the original font?',
            a: 'Yes. Panna writes with the font embedded in the PDF. If you type a character that isn’t in that font’s subset, it tells you and draws just that character in the closest match.',
        },
        {
            q: 'Can I change existing text, not just add new text?',
            a: 'Yes, that’s the core of the editor. Click any line or paragraph and edit it in place, and the result is real, searchable text.',
        },
        {
            q: 'Can I edit a scanned PDF?',
            a: 'Not the text itself, because a scan is a picture. Use White-out to cover the old words and Add text to type new ones. OCR isn’t available yet.',
        },
        {
            q: 'Can I open a password-protected PDF?',
            a: 'Yes, if you know the password. It’s used only in your browser and never stored, and the downloaded copy opens without it. Please only open and edit documents you’re authorised to change.',
        },
        {
            q: 'Does it work on my phone?',
            a: 'Yes, in Chrome, Safari, Edge and Firefox on Android phones, iPhones, tablets and computers. Very large PDFs open faster on a laptop.',
        },
        {
            q: 'What if I close the tab by mistake?',
            a: 'Your work is autosaved in your browser. Open the editor again and choose Continue editing.',
        },
        {
            q: 'Can I edit a PDF typed in Kruti Dev?',
            a: 'Kruti Dev stores Hindi as English letters, so edited text would come out jumbled. Erase the line and retype it with Add text, and it’s saved as proper Unicode Hindi.',
        },
        {
            q: 'Will anyone be able to tell the PDF was edited?',
            a: 'On the page, a Panna edit blends in. Like most PDF software, though, Panna records itself in the file’s Producer field and updates the modification date, which is standard and honest practice. Use it on documents you’re entitled to change.',
        },
        {
            q: 'Can I merge, split or compress PDFs?',
            a: 'Not yet. The site lists merge, split, compress and PDF to Word as the next tools in line.',
        },
        {
            q: 'Is the text in a LaTeX or ChatGPT PDF selectable?',
            a: 'Yes. It’s a real vector PDF with searchable text, clickable links and bookmarks.',
        },
    ],

    closing: [
        {
            type: 'html',
            html: h`
<p>For years, “free online PDF editor” has meant putting up with a white box, a mismatched font and a watermark, and sending a private file to a stranger’s server along the way. Panna is our attempt to end that. It edits the text inside the PDF in the document’s own font, deletes what you erase, handles Hindi the way Hindi is actually written, turns messy AI maths into clean pages, and does all of it on your device, for free.</p>
<p>It isn’t the biggest PDF toolbox around yet. There’s no OCR, and merge, split, compress and convert are still to come. But if the job in front of you is “fix this PDF properly, right now”, we think you’ll like it.</p>
<div class="wbx-cards wide">
<a class="wbx-card" href="${EDIT}" target="_blank" rel="noopener"><span class="wbx-card-t">Edit PDF</span><span class="wbx-card-u">pdf.testoza.com/edit-pdf</span><span class="wbx-card-d">Change text in its own font, erase, sign and organise pages.</span></a>
<a class="wbx-card" href="${HINDI}" target="_blank" rel="noopener"><span class="wbx-card-t">Edit Hindi PDF</span><span class="wbx-card-u">pdf.testoza.com/edit-hindi-pdf</span><span class="wbx-card-d">Hindi forms and documents with correct matras and conjuncts.</span></a>
<a class="wbx-card" href="${LATEX}" target="_blank" rel="noopener"><span class="wbx-card-t">LaTeX to PDF</span><span class="wbx-card-u">pdf.testoza.com/latex-to-pdf</span><span class="wbx-card-d">Full LaTeX documents and maths as a clean, paged PDF.</span></a>
<a class="wbx-card" href="${CHATGPT}" target="_blank" rel="noopener"><span class="wbx-card-t">ChatGPT to PDF</span><span class="wbx-card-u">pdf.testoza.com/chatgpt-to-pdf</span><span class="wbx-card-d">Save AI answers with every equation intact.</span></a>
</div>
<p>Panna is made by <a href="https://testoza.com/">TestoZa</a>, a free online test maker for teachers, schools and coaching institutes. If you teach from PDFs, you can also <a href="https://testoza.com/pdf-to-quiz">turn a PDF into an online test</a> with automatic grading.</p>
<p class="wbx-note"><strong>Use it responsibly.</strong> Please use Panna on documents you own or have permission to change. Altering certificates, marksheets or IDs issued by someone else to misrepresent facts is fraud.</p>`,
        },
    ],

    sources: [
        {
            label: 'Smallpdf',
            links: [
                { label: 'pricing', href: 'https://smallpdf.com/pricing' },
                { label: 'free vs Pro', href: 'https://smallpdf.com/blog/smallpdf-free-vs-pro-plan-comparison' },
                { label: 'file safety', href: 'https://smallpdf.com/blog/is-smallpdf-safe' },
            ],
        },
        {
            label: 'iLovePDF',
            links: [
                { label: 'editing existing text', href: 'https://www.ilovepdf.com/blog/edit-pdf-text' },
                { label: 'FAQ', href: 'https://www.ilovepdf.com/help/faq' },
            ],
        },
        {
            label: 'Sejda',
            links: [
                { label: 'PDF editor', href: 'https://www.sejda.com/pdf-editor' },
                { label: 'help', href: 'https://www.sejda.com/help' },
            ],
        },
        {
            label: 'Adobe',
            links: [{ label: 'Acrobat online PDF editor', href: 'https://www.adobe.com/acrobat/online/pdf-editor.html' }],
        },
        {
            label: 'PDF24',
            links: [
                { label: 'Edit PDF', href: 'https://tools.pdf24.org/en/edit-pdf' },
                { label: 'editing text (help centre)', href: 'https://help.pdf24.org/en/questions/question/edit-text/' },
            ],
        },
        {
            label: 'Overleaf',
            links: [{ label: 'plan limits', href: 'https://docs.overleaf.com/getting-started/free-and-premium-plans/plan-limits' }],
        },
    ],
};

export const STOP_PAINTING_WHITE_BOXES: StaticArticle = { meta: WHITE_BOXES_META, body };
