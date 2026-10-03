/**
 * pdf.testoza.com/how-to-edit-a-pdf: metadata, the how-to steps, the FAQ and the
 * sources. The same text feeds the visible page and its structured data (Article,
 * HowTo, FAQPage), so Google sees markup that matches the page.
 *
 * Product claims were checked against src/pdf (October 2026); facts about other
 * software come from each company's own help pages, listed in GUIDE_SOURCES.
 */
import type { Faq, Step } from '../site/content';

export const GUIDE_META = {
    path: '/how-to-edit-a-pdf',
    /** Kept short enough for a search result (about 60 characters). */
    title: 'How to Edit a PDF for Free Without Changing the Font | Panna',
    h1: 'How to edit a PDF for free, without changing the font',
    /** The part of the H1 drawn in the gradient. */
    keyPhrase: 'edit a PDF',
    description: 'Edit any PDF for free on a phone or laptop: change text in its own font, delete words for real, sign, fix scans and Hindi. Step-by-step, with a live demo.',
    dek: 'Change a name, fix a date, delete a line, sign a form or fix a Hindi document, on a phone or a laptop. This guide covers every way to edit a PDF and why most of them change your font. It also shows how to make an edit nobody can spot, with a working editor on the page to practise on.',
    datePublished: '2026-10-02',
    dateModified: '2026-10-02',
    dateLabel: '2 October 2026',
    readMinutes: 15,
    author: 'TestoZa team',
    ogImage: '/og/how-to-edit-a-pdf.png',
    ogAlt: 'How to edit a PDF without changing the font: a certificate being edited in Panna',
} as const;

/** One paragraph a search engine or an AI assistant can quote as the answer. */
export const GUIDE_ANSWER =
    'To edit a PDF for free, open it in an editor that changes the text inside the file, such as Panna at pdf.testoza.com/edit-pdf. Click the line you want to change, type, and press Download. Panna writes your words in the PDF’s own embedded font, deletes the text you remove instead of covering it, and works in the browser, so the file is never uploaded and there is no sign-up or watermark.';

export const GUIDE_STEPS: Step[] = [
    {
        title: 'Open the PDF',
        text: 'Go to pdf.testoza.com/edit-pdf and drop the file on the page, or tap Choose PDF. It opens inside your browser; nothing is uploaded.',
    },
    {
        title: 'Click the text you want to change',
        text: 'With Edit text selected, click the line or paragraph. A text box opens exactly on top of it, in the PDF’s own font, size and colour.',
    },
    {
        title: 'Type your change',
        text: 'Edit as you would in a word processor. If you type a letter the PDF’s font doesn’t contain, the editor names it and draws only that letter in the closest matching font.',
    },
    {
        title: 'Finish the edit',
        text: 'Press Enter, or Ctrl+Enter in a paragraph, or tap Done. Use Erase, Add text, Highlight, Sign or Image for anything else on the page.',
    },
    {
        title: 'Download the edited PDF',
        text: 'Press Download PDF or Ctrl+S. The file is saved straight away, with no watermark and no account.',
    },
];

export const GUIDE_FAQS: Faq[] = [
    {
        q: 'How do I edit a PDF for free?',
        a: 'Open the PDF in a free editor that changes the text itself, such as Panna at pdf.testoza.com/edit-pdf. Click the text, type your change and press Download. Panna is free with no sign-up or watermark, and it works in the browser on phones and computers without uploading the file.',
    },
    {
        q: 'How do I edit text in a PDF without changing the font?',
        a: 'Use an editor that writes with the font embedded in the PDF instead of retyping your words in Arial or Helvetica. Panna does this: click the line, type, and the new words use the document’s own font, size and colour. If the embedded font is missing a letter you type, Panna tells you and uses the closest match for that letter only.',
    },
    {
        q: 'Why does the font change when I edit a PDF?',
        a: 'Most PDFs carry only the letters they already use (a font subset), and many editors can’t write with that subset, so they type your change in a standard font such as Arial. Desktop programs also substitute a fallback font when the original isn’t installed on your computer.',
    },
    {
        q: 'Can I edit a PDF on my phone?',
        a: 'Yes. Open pdf.testoza.com/edit-pdf in Chrome on Android or Safari on iPhone, choose the PDF from your files, tap the text and type. The toolbar scrolls sideways, and the download goes to your Downloads folder (Android) or the Files app (iPhone).',
    },
    {
        q: 'How do I edit a scanned PDF?',
        a: 'A scanned page is a photo, so there is no text to change. Cover the old words with White-out, which matches the paper colour, and type the new words with Add text. To make the whole scan editable you need OCR (text recognition), which Panna does not have yet.',
    },
    {
        q: 'How do I permanently remove text from a PDF?',
        a: 'Use a tool that deletes the words from the file, such as Panna’s Erase. Drawing a white or black box only hides the text: it can still be copied, searched or recovered. To check, select all the text in the downloaded file, copy it and paste it into a note.',
    },
    {
        q: 'Can I edit a PDF in Word or Google Docs?',
        a: 'Both convert the PDF into a new document rather than editing it. Word warns that the result might not look exactly like the original. Google Docs reads the text with OCR, accepts files of 2 MB or less, and usually loses tables and columns. They suit text-heavy files you plan to rework, not certificates or forms.',
    },
    {
        q: 'Is it safe to edit a PDF online?',
        a: 'It depends on where the file goes. Most online editors upload it to their servers and delete it after a few hours. Panna processes the PDF inside your browser, so the document never leaves your device, which suits marksheets, ID proofs and offer letters.',
    },
    {
        q: 'How do I edit a password-protected PDF?',
        a: 'If the PDF asks for a password to open, enter it in the editor; Panna uses it only in your browser and the edited copy opens without it. If you don’t know the password, ask the person who sent the file. Only edit documents you have the right to change.',
    },
    {
        q: 'Can anyone tell that a PDF was edited?',
        a: 'A same-font edit is hard to spot on the page, but the file still records it: PDF software writes its name in the Producer field and updates the modification date, and Panna does too. Edit your own documents; changing a certificate or marksheet issued by someone else is forgery.',
    },
];

export interface SourceGroup {
    label: string;
    links: { label: string; href: string }[];
}

export const GUIDE_SOURCES: SourceGroup[] = [
    {
        label: 'The PDF format',
        links: [
            { label: 'ISO 32000-2:2020 (PDF 2.0)', href: 'https://www.iso.org/standard/75839.html' },
            { label: 'Library of Congress format description', href: 'https://www.loc.gov/preservation/digital/formats/fdd/fdd000474.shtml' },
        ],
    },
    {
        label: 'Adobe',
        links: [{ label: 'Edit text in PDFs (font substitution)', href: 'https://helpx.adobe.com/acrobat/using/edit-text-pdfs1.html' }],
    },
    {
        label: 'Microsoft',
        links: [{ label: 'Opening PDFs in Word', href: 'https://support.microsoft.com/en-us/office/opening-pdfs-in-word-1d1d2acc-afa0-46ef-891d-b76bcd83d9c8' }],
    },
    {
        label: 'Google',
        links: [{ label: 'Convert PDF and photo files to text', href: 'https://support.google.com/drive/answer/176692' }],
    },
    {
        label: 'Apple',
        links: [
            { label: 'Annotate a PDF in Preview', href: 'https://support.apple.com/guide/preview/annotate-a-pdf-prvw11580/mac' },
            { label: 'Fill out and sign PDF forms in Preview', href: 'https://support.apple.com/guide/preview/fill-out-and-sign-pdf-forms-prvw35725/mac' },
        ],
    },
    {
        label: 'Redaction failure (January 2019)',
        links: [{ label: 'Mother Jones', href: 'https://www.motherjones.com/politics/2019/01/paul-manafort-failed-redaction/' }],
    },
];
