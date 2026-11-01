/**
 * pdf.js setup. The legacy build is used on purpose: it supports the older
 * Android/Chrome versions still common among our users, at a small size cost.
 * Runtime assets are self-hosted under /pdfjs/ (see vite.config.ts).
 */
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type { PDFDocumentProxy, PDFPageProxy };

const OPTIONS = {
    cMapUrl: '/pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdfjs/standard_fonts/',
    wasmUrl: '/pdfjs/wasm/',
    iccUrl: '/pdfjs/iccs/',
    // Never evaluate font programs / scripts from untrusted PDFs.
    isEvalSupported: false,
    enableXfa: false,
};

/** Opens bytes with pdf.js. The buffer is copied because pdf.js transfers it to its worker. */
export function openWithPdfjs(bytes: Uint8Array, password?: string): Promise<PDFDocumentProxy> {
    return pdfjs.getDocument({ data: bytes.slice(), password, ...OPTIONS }).promise;
}

export const AnnotationMode = pdfjs.AnnotationMode;
