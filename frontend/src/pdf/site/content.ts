/**
 * Copy for the pdf.testoza.com pages. Kept in one place because the same text
 * feeds the visible page AND its structured data (FAQ, how-to steps): Google
 * expects markup to match what users see.
 *
 * Every claim here must stay true for the product as built — no ratings, no
 * user counts, no "best" superlatives we can't back.
 */

/** Shown on pages and used as dateModified in structured data. */
export const UPDATED = '2026-09-25';
export const UPDATED_LABEL = '25 September 2026';

export interface Faq {
    q: string;
    a: string;
}
export interface Step {
    title: string;
    text: string;
}

// ---------------------------------------------------------------------------
// "What is …" definitions and quick facts. Written to be quoted as-is by search
// engines and AI assistants: one self-contained, factual paragraph per tool.

export const DEFINITIONS = {
    home: 'Panna is a free set of online PDF tools made by TestoZa, an Indian education technology company. It includes a PDF editor that keeps the original font, a Hindi PDF editor, and LaTeX and ChatGPT to PDF converters. Every tool runs in the browser, so files are never uploaded, and none needs an account.',
    editor: 'Panna PDF Editor is a free online PDF editor made by TestoZa. It edits the existing text of a PDF in the document’s own embedded font, deletes erased text from the file, and adds text, images, signatures, highlights and shapes. It runs entirely in the browser, so files are never uploaded, and it needs no sign-up.',
    hindi: 'Panna Hindi PDF Editor is the Hindi mode of Panna, the free online PDF editor made by TestoZa. It edits Unicode Hindi (Devanagari) text in PDFs with correct matras, conjuncts and reph, keeps the edited text searchable, and works in the browser without uploading the file or creating an account.',
    latex: 'Panna LaTeX to PDF is a free online converter made by TestoZa. It turns LaTeX, Markdown and maths copied from ChatGPT, Gemini or Claude into a paged PDF with real, selectable text, and repairs formulas damaged by copying. It runs in the browser and needs no sign-up.',
    chatgpt: 'Panna ChatGPT to PDF is a free tool made by TestoZa that saves answers from ChatGPT, Gemini, Claude and other AI chats as a clean PDF, with equations typeset and tables and Hindi preserved. The PDF has selectable text. It runs in the browser, with no sign-up and no watermark.',
} as const;

export const COMMON_FACTS: [string, string][] = [
    ['Price', 'Free'],
    ['Account', 'Not needed'],
    ['Watermark', 'None'],
    ['Privacy', 'Files are processed in your browser and never uploaded'],
    ['Languages', 'English and Hindi (Devanagari)'],
    ['Works on', 'Android, iPhone, Windows, Mac and Linux, in any modern browser'],
    ['Made by', 'TestoZa Educational Systems, Chennai, India'],
];

export const TOOL_FACTS: Record<'editor' | 'hindi' | 'latex' | 'chatgpt', [string, string][]> = {
    editor: [['Output', 'Your original PDF, edited in place: real text, not an image']],
    hindi: [['Hindi text', 'Unicode Devanagari; new text set in Noto Sans Devanagari']],
    latex: [
        ['Input', 'LaTeX, Markdown, ChatGPT, Gemini and Claude maths'],
        ['Output', 'A4 or Letter PDF with selectable text, links and bookmarks'],
    ],
    chatgpt: [
        ['Works with', 'ChatGPT, Gemini, Claude, Perplexity and other AI chats'],
        ['Output', 'A4 or Letter PDF with selectable text'],
    ],
};

// ---------------------------------------------------------------------------
// Hub (/)

export const HOME_FAQS: Faq[] = [
    {
        q: 'What is Panna?',
        a: 'Panna (पन्ना, “page”) is a set of free PDF tools made by TestoZa. It has a PDF editor that changes existing text in the document’s own font, a Hindi PDF editor, and a LaTeX and ChatGPT to PDF converter for maths.',
    },
    {
        q: 'Do I need an account?',
        a: 'No. Open a tool, do your work and download the file. There is no account, no watermark and no subscription.',
    },
    {
        q: 'Are my files safe?',
        a: 'Your PDF is opened and processed inside your own browser and is never uploaded to a server. Autosave keeps unfinished work only in the browser you are using.',
    },
    {
        q: 'Which tools are coming next?',
        a: 'Merge, split, compress and PDF to Word are planned next. You can tell us what you need on the TestoZa support page.',
    },
];

// ---------------------------------------------------------------------------
// PDF editor (/edit-pdf)

export const EDITOR_STEPS: Step[] = [
    {
        title: 'Open your PDF',
        text: 'Drop the file into the box above or tap “Choose PDF”. It opens right in your browser — nothing is uploaded.',
    },
    {
        title: 'Click the text and type',
        text: 'Click any line and change it. Your words are written in the PDF’s own font, in the same place. Use Add text, Erase, Highlight, Sign or Image from the toolbar for everything else.',
    },
    {
        title: 'Download the edited PDF',
        text: 'Press Download (or Ctrl+S). You get the file straight away — no watermark, no account, no waiting.',
    },
];

export const EDITOR_TOOLS: { title: string; text: string }[] = [
    { title: 'Edit existing text', text: 'Change names, dates, marks or whole paragraphs. Paragraphs re-flow inside their width and justified text stays justified.' },
    { title: 'Add new text', text: 'Place a text box anywhere, in the document’s fonts or in Helvetica, Times, Courier or Noto (including Hindi).' },
    { title: 'Erase for real', text: 'Drag over text to delete it from the file. The words are removed, not hidden under a white box.' },
    { title: 'White-out', text: 'Cover part of a scanned page or an image with the page colour, then type on top.' },
    { title: 'Highlight, draw and shapes', text: 'Highlight lines of text, draw freehand, and add rectangles, circles, lines and arrows.' },
    { title: 'Images and signatures', text: 'Insert a logo or photo, or sign by drawing, typing or uploading a signature.' },
    { title: 'Find and replace', text: 'Change a name, date or roll number everywhere in the document at once — formatting is kept.' },
    { title: 'Organise pages', text: 'Reorder, rotate, duplicate and delete pages, or insert a blank page.' },
    { title: 'Password-protected PDFs', text: 'Enter the password to open a locked PDF. The downloaded copy opens without it.' },
];

export const EDITOR_COMPARE: [string, boolean | string, boolean | string][] = [
    ['Edited text uses the PDF’s own font', true, 'Retyped in Arial or Helvetica'],
    ['Erased text is deleted from the file', true, 'Covered with a white box'],
    ['Table cells edit independently', true, 'Often one box per column'],
    ['Hindi (Devanagari) text shaped correctly', true, 'Often broken matras'],
    ['Find and replace across pages', true, 'Rare'],
    ['Download without an account', true, 'Sign-up or paywall at download'],
    ['File stays on your device', true, 'Uploaded to a server'],
    ['Watermark on free downloads', 'None', 'Common'],
];

export const EDITOR_FAQS: Faq[] = [
    {
        q: 'How can I edit a PDF for free?',
        a: 'Open the PDF in Panna, click the text you want to change, type, and press Download. It is free, needs no account and adds no watermark. Everything happens in your browser, so the file is never uploaded.',
    },
    {
        q: 'Can I change the existing text in a PDF, not just add new text?',
        a: 'Yes. Click any line or paragraph and edit it in place. Panna rewrites the text inside the PDF itself, so the result is real, searchable text — not a picture pasted on top.',
    },
    {
        q: 'Will the edited text match the original font?',
        a: 'Panna writes your text with the font embedded in the PDF. PDFs often contain only the letters they already use; if you type a letter that is missing, Panna tells you which one and draws just that letter in the closest matching font.',
    },
    {
        q: 'How do I remove text from a PDF completely?',
        a: 'Use the Erase tool and drag over the text. Panna deletes those words from the file, so they cannot be copied, searched or recovered from under a white box.',
    },
    {
        q: 'Can I edit a scanned PDF?',
        a: 'A scanned page is a photo, so there is no text to change. Use White-out to cover the old words and Add text to type new ones. Automatic text recognition (OCR) is not available yet.',
    },
    {
        q: 'Is my PDF uploaded to a server?',
        a: 'No. The file is opened and edited inside your browser on your own device. That is why Panna is safe for marksheets, certificates, ID proofs and other private documents.',
    },
    {
        q: 'Can I edit a PDF on my phone?',
        a: 'Yes. Panna works in Chrome, Safari, Edge and Firefox on Android phones, iPhones, tablets and computers. Very large PDFs open faster on a laptop.',
    },
    {
        q: 'Can I open a password-protected PDF?',
        a: 'Yes. If the PDF needs a password to open, enter it — it is used only in your browser. Please only edit documents you have the right to change.',
    },
    {
        q: 'What if I close the tab by mistake?',
        a: 'Your changes are saved automatically in this browser. Open the editor again and choose “Continue editing” to pick up where you left off.',
    },
];

// ---------------------------------------------------------------------------
// Hindi PDF editor (/edit-hindi-pdf)

export const HINDI_STEPS: Step[] = [
    {
        title: 'PDF खोलें · Open the PDF',
        text: 'ऊपर वाले बॉक्स में PDF डालें या “Choose PDF” दबाएँ। फ़ाइल आपके ब्राउज़र में ही खुलती है, कहीं अपलोड नहीं होती। Drop the file above — it opens in your browser and is never uploaded.',
    },
    {
        title: 'हिंदी टेक्स्ट पर क्लिक करके लिखें · Click and type',
        text: 'जिस लाइन को बदलना है उस पर क्लिक करें और लिखें — Gboard, Windows का हिंदी कीबोर्ड या कहीं से कॉपी करके पेस्ट करें। Click the line and type in Hindi, or paste Hindi text.',
    },
    {
        title: 'डाउनलोड करें · Download',
        text: 'Download दबाएँ। PDF बिना वॉटरमार्क और बिना अकाउंट के तुरंत मिल जाएगी। Press Download — no watermark, no account.',
    },
];

export const HINDI_SUPPORT: [string, string, string][] = [
    ['Unicode Hindi (Mangal, Nirmala UI, Noto, Kokila; PDFs from Word, Google Docs or Chrome)', 'Edit in place', 'The text is stored as real Hindi letters, so Panna can change it and keep it searchable.'],
    ['Old non-Unicode fonts (Kruti Dev, DevLys, Chanakya)', 'Erase and retype', 'These fonts store Hindi as English letters, so the text shows up jumbled when edited. Erase the line and type it again with Add text.'],
    ['Scanned documents and photos', 'White-out and type', 'A scan is a picture with no text layer. Cover the old words with White-out and add new text on top.'],
];

export const HINDI_FAQS: Faq[] = [
    {
        q: 'हिंदी PDF में टेक्स्ट कैसे बदलें?',
        a: 'Panna में PDF खोलें, जिस हिंदी लाइन को बदलना है उस पर क्लिक करें, नया टेक्स्ट लिखें और Download दबाएँ। मात्राएँ और संयुक्त अक्षर (जैसे क्ष, त्र, ज्ञ) सही बनते हैं और टेक्स्ट सर्च भी हो सकता है। यह मुफ़्त है और फ़ाइल अपलोड नहीं होती।',
    },
    {
        q: 'How do I edit Hindi text in a PDF?',
        a: 'Open the PDF in Panna, click the Hindi line you want to change, type the new text and download. Matras and conjuncts are shaped correctly, and the text stays searchable and copyable in other apps.',
    },
    {
        q: 'Which font is used for the Hindi text I type?',
        a: 'New Hindi text is set in Noto Sans Devanagari, a clean Unicode font designed for Hindi. Hindi fonts embedded inside PDFs usually cannot be reshaped for new words, so Panna uses Noto to keep every matra in the right place.',
    },
    {
        q: 'Can I edit a PDF typed in Kruti Dev?',
        a: 'Kruti Dev and similar old fonts store Hindi as English letters, so the existing text looks jumbled when edited. Erase that line and type it again with Add text — it will be saved as proper Unicode Hindi.',
    },
    {
        q: 'मोबाइल पर हिंदी PDF एडिट हो सकती है?',
        a: 'हाँ। Android या iPhone के Chrome या Safari में pdf.testoza.com खोलें। Gboard में हिंदी भाषा जोड़कर सीधे हिंदी में लिख सकते हैं।',
    },
    {
        q: 'Is it free, and is my file private?',
        a: 'Yes to both. There is no sign-up and no watermark, and the PDF is processed inside your browser — it is never uploaded to a server.',
    },
];

// ---------------------------------------------------------------------------
// LaTeX to PDF (/latex-to-pdf)

export const LATEX_STEPS: Step[] = [
    { title: 'Paste your text', text: 'Paste LaTeX, Markdown or an AI answer into the box — or open a sample to see what is supported.' },
    { title: 'Check the pages', text: 'The preview shows real A4 or Letter pages with every page break. Choose margins, font, text size and page numbers.' },
    { title: 'Download the PDF', text: 'Press Download PDF. You get a sharp PDF with selectable, searchable text — no print dialog, no watermark.' },
];

export const LATEX_SYNTAX: [string, string][] = [
    ['\\( … \\) and \\[ … \\]', 'Inline and display maths as written by ChatGPT'],
    ['$ … $ and $$ … $$', 'Inline and display maths as written by Gemini and Claude'],
    ['\\begin{align} … \\end{align}', 'Numbered and aligned equations, matrices, cases, arrays'],
    ['\\documentclass … \\end{document}', 'Whole LaTeX documents: title, sections, lists, tables'],
    ['\\newcommand, \\def', 'Simple macros'],
    ['\\ce{H2SO4}', 'Chemistry equations (mhchem)'],
    ['Markdown', 'Headings, bold, lists, tables, links, code blocks'],
    ['हिंदी', 'Hindi text, including inside \\text{…} in formulas'],
];

export const LATEX_FAQS: Faq[] = [
    {
        q: 'How do I convert LaTeX to PDF online?',
        a: 'Paste your LaTeX into Panna, check the page preview and press Download PDF. Maths is typeset with the KaTeX fonts, and the PDF has real, selectable text. Nothing is uploaded and there is no sign-up.',
    },
    {
        q: 'Can I paste a full LaTeX document?',
        a: 'Yes. \\documentclass, the preamble, \\title and \\maketitle, sections, itemize and enumerate, tabular, numbered equations and simple \\newcommand macros are supported. Drawing packages such as TikZ are not.',
    },
    {
        q: 'Why does maths from ChatGPT or Gemini look broken when I paste it elsewhere?',
        a: 'AI chats write maths in several notations, and copying often loses backslashes or mixes a formula with its rendered text. Panna recognises every common notation and repairs the usual copy damage before typesetting.',
    },
    {
        q: 'Is the text in the PDF selectable?',
        a: 'Yes. The PDF contains real text in the same fonts as the preview, so you can search it, copy from it and zoom in without blur. Headings become bookmarks and links stay clickable.',
    },
    {
        q: 'Does it work with Hindi?',
        a: 'Yes. Hindi text is shaped correctly (matras and conjuncts) and stays searchable, including Hindi written inside formulas with \\text{…}.',
    },
    {
        q: 'Is my text uploaded anywhere?',
        a: 'No. Everything happens in your browser, and your draft is saved only on this device.',
    },
];

// ---------------------------------------------------------------------------
// ChatGPT to PDF (/chatgpt-to-pdf)

export const CHATGPT_STEPS: Step[] = [
    {
        title: 'Copy the answer',
        text: 'In ChatGPT, Gemini or Claude, click the copy button under the answer. Selecting the answer and copying it works too — Panna recovers the maths from the copied page.',
    },
    { title: 'Paste it here', text: 'Paste into the box. Add a title, fix a line or paste more answers underneath — the preview updates as you type.' },
    { title: 'Download the PDF', text: 'Check the pages on the right and press Download PDF. Equations, tables and Hindi come out exactly as shown.' },
];

export const CHATGPT_FAQS: Faq[] = [
    {
        q: 'How do I save a ChatGPT answer as a PDF with the equations intact?',
        a: 'Copy the answer with ChatGPT’s copy button, paste it into Panna and press Download PDF. Panna converts ChatGPT’s \\( … \\) and \\[ … \\] maths into properly typeset equations, so fractions, roots and matrices look right in the PDF.',
    },
    {
        q: 'Why is maths copied from ChatGPT full of symbols like \\( and \\frac?',
        a: 'That is LaTeX, the code ChatGPT uses to write maths. Most apps show the code instead of the formula. Panna reads it and typesets it — including answers where copying dropped the backslashes.',
    },
    {
        q: 'Can I save a whole ChatGPT conversation?',
        a: 'Yes. Paste as many answers as you like one below another. Add headings to separate them, and type \\newpage on its own line wherever you want a new page to start.',
    },
    {
        q: 'Does it work with Gemini, Claude and other AI tools?',
        a: 'Yes. Panna understands the maths notations used by ChatGPT, Gemini, Claude, Perplexity and most AI chat apps, as well as plain LaTeX and Markdown.',
    },
    {
        q: 'Is it free? Is there a watermark?',
        a: 'It is free, with no sign-up and no watermark. Your text never leaves your browser.',
    },
];
