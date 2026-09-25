/**
 * Autosave of the open document to IndexedDB, so a refresh or a closed tab
 * doesn't lose work. Everything stays in this browser; nothing is uploaded.
 */
import type { PageEdit, PageSlot, StoredImage } from '../engine/edits';

export interface SavedSession {
    name: string;
    bytes: Uint8Array;
    edits: PageEdit[];
    slots: PageSlot[];
    images: [string, StoredImage][];
    savedAt: number;
    /** True when the file needs a password to open (we never store passwords). */
    needsPassword: boolean;
}

const DB = 'panna';
const STORE = 'sessions';
const KEY = 'last';
/** Don't autosave huge files (IndexedDB quota on mobile). */
const MAX_BYTES = 60 * 1024 * 1024;

function open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await open();
    try {
        return await new Promise<T>((resolve, reject) => {
            const req = fn(db.transaction(STORE, mode).objectStore(STORE));
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    } finally {
        db.close();
    }
}

export async function saveSession(s: SavedSession): Promise<void> {
    if (s.bytes.length > MAX_BYTES) return;
    try {
        await tx('readwrite', (st) => st.put(s, KEY));
    } catch {
        /* private mode / quota: autosave is best-effort */
    }
}

export async function loadSession(): Promise<SavedSession | null> {
    try {
        return ((await tx('readonly', (st) => st.get(KEY))) as SavedSession | undefined) ?? null;
    } catch {
        return null;
    }
}

export async function clearSession(): Promise<void> {
    try {
        await tx('readwrite', (st) => st.delete(KEY));
    } catch {
        /* ignore */
    }
}
