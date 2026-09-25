/**
 * Panna — TestoZa's PDF tools, served from pdf.testoza.com. "Panna" (पन्ना)
 * means "page" in Hindi, and also "emerald", hence the green identity.
 * Rename or move here and everything follows.
 */
export const PANNA = {
    name: 'Panna',
    by: 'by TestoZa',
    tagline: 'Edit any PDF in its own font',
    description:
        'Free online PDF editor that edits existing text in the same font, erases for real, and works on Hindi and English documents — right in your browser, no sign-up, no watermark.',
    /** Canonical origin of the PDF tools. */
    origin: 'https://pdf.testoza.com',
    /** The main TestoZa site (tests, blog, support, legal pages). */
    testoza: 'https://testoza.com',
    routes: {
        home: '/',
        editor: '/edit-pdf',
        hindi: '/edit-hindi-pdf',
        latex: '/latex-to-pdf',
        chatgpt: '/chatgpt-to-pdf',
    },
} as const;

/** Absolute URL on the TestoZa main site. */
export const testozaUrl = (path = '/') => `${PANNA.testoza}${path}`;
