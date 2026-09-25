/**
 * An open document in the editor: the original bytes, a decrypted pdf-lib copy
 * for text analysis, pdf.js for rendering, and the machinery that turns the
 * edit list into previews and the final file.
 *
 * Previews are real: each edited page is copied into a one-page PDF, the same
 * `applyPageEdits` used for export runs on it, and pdf.js renders the result.
 */
import { PDFDocument, PDFImage, degrees } from 'pdf-lib';
import { analyzePage, applyPageEdits, type PageReport } from '../engine/apply';
import { applyOrder, isBaked, pageIndexOf, type PageEdit, type PageKey, type PageSlot, type StoredImage } from '../engine/edits';
import { FaceRegistry, type FontLoader } from '../engine/faces';
import { FontCache } from '../engine/fonts';
import { collectGarbage } from '../engine/gc';
import { pageView, type PageModel } from '../engine/interpreter';
import type { PageText } from '../engine/layout';
import { loadPdfLib } from '../engine/load';
import type { Rect } from '../engine/matrix';
import { openWithPdfjs, type PDFDocumentProxy, type PDFPageProxy } from './pdfjs';

export interface PageInfo {
    key: PageKey;
    index: number;
    /** CropBox in user space (points). */
    view: Rect;
    /** Page's own /Rotate. */
    rotate: number;
}

export interface Preview {
    page: PDFPageProxy;
    report: PageReport;
    /** Release the pdf.js document behind this preview. */
    dispose: () => void;
}

export const browserFontLoader: FontLoader = async (file) => {
    const res = await fetch(`/pdf-fonts/${file}`);
    if (!res.ok) throw new Error(`Font ${file} failed to load (${res.status})`);
    return new Uint8Array(await res.arrayBuffer());
};

export const A4: [number, number] = [595.28, 841.89];

export class PdfSession {
    readonly pages: PageInfo[];
    readonly images = new Map<string, StoredImage>();
    /** Glyph usage shared by every document we build (see FontInfo.usedCodes). */
    private readonly usage = new Map<string, Set<number>>();
    private readonly fonts: FontCache;
    private readonly analysis = new Map<PageKey, { model: PageModel; text: PageText }>();
    private readonly baseBytes = new Map<PageKey, Promise<Uint8Array>>();
    private imageSeq = 0;

    private constructor(
        readonly name: string,
        readonly bytes: Uint8Array,
        private readonly password: string | undefined,
        readonly libDoc: PDFDocument,
        readonly pdfjs: PDFDocumentProxy,
        readonly encrypted: boolean,
        readonly restricted: boolean,
        private readonly fontLoader: FontLoader,
    ) {
        this.fonts = new FontCache(libDoc.context, this.usage);
        this.pages = libDoc.getPages().map((p, index) => {
            const { view, rotate } = pageView(libDoc.context, p);
            return { key: `p${index}`, index, view, rotate };
        });
    }

    /** Opens a PDF. Throws PasswordError (from the engine) when a password is needed. */
    static async open(bytes: Uint8Array, name: string, password?: string, fontLoader: FontLoader = browserFontLoader): Promise<PdfSession> {
        const { doc, encrypted, restricted } = await loadPdfLib(bytes, password);
        const pdfjs = await openWithPdfjs(bytes, password);
        return new PdfSession(name, bytes, password, doc, pdfjs, encrypted, restricted, fontLoader);
    }

    get pageCount() {
        return this.pages.length;
    }

    /** Opened with a password (autosave then asks for it again; we never store it). */
    get usesPassword() {
        return !!this.password;
    }

    /** Text blocks of an original page (cached). Blank pages have none. */
    analyze(key: PageKey): { model: PageModel; text: PageText } | null {
        const idx = pageIndexOf(key);
        if (idx < 0 || idx >= this.pages.length) return null;
        let a = this.analysis.get(key);
        if (!a) {
            a = analyzePage(this.libDoc, this.libDoc.getPage(idx), this.fonts);
            this.analysis.set(key, a);
        }
        return a;
    }

    /** Fonts seen so far (for the "use a document font" menu). */
    documentFonts() {
        return this.fonts.all().filter((f) => f.editable);
    }

    async originalPage(key: PageKey): Promise<PDFPageProxy | null> {
        const idx = pageIndexOf(key);
        return idx < 0 ? null : this.pdfjs.getPage(idx + 1);
    }

    private pageBytes(key: PageKey): Promise<Uint8Array> {
        let p = this.baseBytes.get(key);
        if (!p) {
            p = (async () => {
                const out = await PDFDocument.create({ updateMetadata: false });
                const [copy] = await out.copyPages(this.libDoc, [pageIndexOf(key)]);
                out.addPage(copy);
                return out.save({ useObjectStreams: false, updateFieldAppearances: false });
            })();
            this.baseBytes.set(key, p);
            p.catch(() => this.baseBytes.delete(key));
        }
        return p;
    }

    private env(doc: PDFDocument) {
        return {
            faces: new FaceRegistry(doc, this.fontLoader),
            fonts: new FontCache(doc.context, this.usage),
            images: this.images,
            embeddedImages: new Map<string, PDFImage>(),
        };
    }

    /**
     * Renders a page with its content edits (text changes, erasures) applied —
     * the exact bytes the export will produce for those edits.
     */
    async preview(key: PageKey, edits: PageEdit[]): Promise<Preview | null> {
        const baked = applyOrder(edits.filter((e) => e.page === key && isBaked(e)));
        if (!baked.length || pageIndexOf(key) < 0) return null;
        const doc = await PDFDocument.load(await this.pageBytes(key), { updateMetadata: false });
        const report = await applyPageEdits(doc, doc.getPage(0), baked, this.env(doc));
        const bytes = await doc.save({ useObjectStreams: false, updateFieldAppearances: false });
        const pdf = await openWithPdfjs(bytes);
        const page = await pdf.getPage(1);
        return { page, report, dispose: () => void pdf.loadingTask.destroy() };
    }

    /** Plans text edits without rendering (fast feedback: substitutions, bbox). */
    async plan(key: PageKey, edits: PageEdit[]): Promise<PageReport | null> {
        const texts = edits.filter((e) => e.page === key && e.kind === 'text');
        if (!texts.length || pageIndexOf(key) < 0) return null;
        const doc = await PDFDocument.load(await this.pageBytes(key), { updateMetadata: false });
        return applyPageEdits(doc, doc.getPage(0), texts, this.env(doc));
    }

    addImage(img: StoredImage): string {
        const id = `img${++this.imageSeq}-${Date.now().toString(36)}`;
        this.images.set(id, img);
        return id;
    }

    /** Builds the final PDF. */
    async export(slots: PageSlot[], edits: PageEdit[], opts: { onProgress?: (done: number, total: number) => void } = {}): Promise<Uint8Array> {
        const { doc } = await loadPdfLib(this.bytes, this.password);
        const env = this.env(doc);
        const original = doc.getPages();

        // 1. Content edits on original pages (before any page is moved).
        const byPage = new Map<PageKey, PageEdit[]>();
        for (const e of edits) byPage.set(e.page, [...(byPage.get(e.page) ?? []), e]);
        const total = byPage.size + 1;
        let done = 0;
        for (const [key, list] of byPage) {
            const idx = pageIndexOf(key);
            if (idx >= 0 && original[idx]) await applyPageEdits(doc, original[idx], applyOrder(list), env);
            opts.onProgress?.(++done, total);
        }

        // 2. Arrange pages: order, deletions, duplicates, rotation, blank pages.
        const need = new Map<number, number>();
        for (const s of slots) if (s.src >= 0) need.set(s.src, (need.get(s.src) ?? 0) + 1);
        const copies = new Map<number, ReturnType<PDFDocument['getPage']>[]>();
        for (const [src, n] of need) if (n > 1) copies.set(src, await doc.copyPages(doc, Array(n - 1).fill(src)));
        for (let i = doc.getPageCount() - 1; i >= 0; i--) doc.removePage(i);
        const used = new Map<number, number>();
        for (const s of slots) {
            let page;
            if (s.src < 0) {
                page = doc.addPage(s.size ?? A4);
                const list = byPage.get(s.key);
                if (list?.length) await applyPageEdits(doc, page, applyOrder(list), env);
            } else {
                const k = used.get(s.src) ?? 0;
                used.set(s.src, k + 1);
                page = k === 0 ? original[s.src] : copies.get(s.src)![k - 1];
                doc.addPage(page);
            }
            if (s.rotate) page.setRotation(degrees((((page.getRotation().angle + s.rotate) % 360) + 360) % 360));
        }

        // 3. Metadata, garbage collection (makes erasures real), save.
        doc.setModificationDate(new Date());
        doc.setProducer('Panna PDF Editor by TestoZa (testoza.com/pdf)');
        await doc.flush();
        collectGarbage(doc);
        const out = await doc.save({ useObjectStreams: true, updateFieldAppearances: false, addDefaultPage: false });
        opts.onProgress?.(total, total);
        return out;
    }

    destroy() {
        void this.pdfjs.loadingTask.destroy();
    }
}
