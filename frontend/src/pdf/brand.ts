/**
 * Panna — TestoZa's PDF tools. "Panna" (पन्ना) means "page" in Hindi, and
 * also "emerald", hence the green identity. Rename here and everything follows.
 */
export const PANNA = {
    name: 'Panna',
    by: 'by TestoZa',
    tagline: 'Edit any PDF in its own font',
    description:
        'Free online PDF editor that edits existing text in the same font, erases for real, and works on Hindi and English documents — right in your browser, no sign-up, no watermark.',
    routes: {
        home: '/pdf',
        editor: '/pdf/editor',
        latex: '/pdf/latex-to-pdf',
    },
} as const;
