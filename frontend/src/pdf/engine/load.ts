import { ParseSpeeds, PDFDocument } from 'pdf-lib';
import { decryptDocument, makeDecryptor } from './decrypt';

export interface LoadedDoc {
    doc: PDFDocument;
    /** The file was encrypted (we decrypted it in memory). */
    encrypted: boolean;
    /** The author disallowed modification (owner-password permissions). */
    restricted: boolean;
}

/**
 * Loads a PDF for editing with pdf-lib, decrypting it when needed.
 * Throws PasswordError when a user password is required or wrong.
 */
export async function loadPdfLib(bytes: Uint8Array, password?: string): Promise<LoadedDoc> {
    const doc = await PDFDocument.load(bytes, {
        ignoreEncryption: true,
        updateMetadata: false,
        throwOnInvalidObject: false,
        parseSpeed: ParseSpeeds.Fastest,
    });
    if (!doc.isEncrypted) return { doc, encrypted: false, restricted: false };
    const d = await makeDecryptor(doc, password ?? '');
    if (!d) return { doc, encrypted: false, restricted: false };
    await decryptDocument(doc, d);
    return { doc, encrypted: true, restricted: d.restricted };
}
