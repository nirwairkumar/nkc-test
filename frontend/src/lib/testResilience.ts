/**
 * testResilience.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Three pillars of exam session resilience:
 *   1. withExponentialRetry  – retries any async operation with backoff
 *   2. AnswerVault           – IndexedDB-backed local backup of live answers
 *   3. ProactiveTokenRefresh – keeps the JWT alive during long (2-3 hr) exams
 */

// ─── 1. EXPONENTIAL RETRY ─────────────────────────────────────────────────────

export interface RetryOptions {
    maxAttempts?: number;   // default 5
    baseDelayMs?: number;   // default 1000 ms
    maxDelayMs?: number;    // default 15000 ms
    onRetry?: (attempt: number, error: any) => void;
}

/**
 * Wraps an async function with exponential-backoff retry.
 * Delays: 1s, 2s, 4s, 8s, 15s (capped).
 */
export async function withExponentialRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const { maxAttempts = 5, baseDelayMs = 1000, maxDelayMs = 15000, onRetry } = options;

    let lastError: any;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt === maxAttempts) break;

            const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
            onRetry?.(attempt, err);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}


// ─── 2. ANSWER VAULT (IndexedDB) ─────────────────────────────────────────────

const DB_NAME = 'testoza_vault';
const DB_VERSION = 2;
const STORE_NAME = 'answer_backups';
const KV_STORE_NAME = 'kv_store';

function openVaultDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains(KV_STORE_NAME)) {
                db.createObjectStore(KV_STORE_NAME, { keyPath: 'key' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export const AnswerVault = {
    /**
     * Save answers to IndexedDB. Overwrites any existing backup for this key.
     * Key format: `{userId}_{testId}`
     */
    async save(userId: string, testId: string, answers: Record<string, any>): Promise<void> {
        try {
            const db = await openVaultDB();
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).put({
                    key: `${userId}_${testId}`,
                    answers,
                    savedAt: new Date().toISOString(),
                });
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (e) {
            // Non-fatal: log but don't block the exam
            console.warn('[AnswerVault] save failed:', e);
        }
    },

    /**
     * Load saved answers from IndexedDB.
     * Returns null if nothing found.
     */
    async load(userId: string, testId: string): Promise<{ answers: Record<string, any>; savedAt: string } | null> {
        try {
            const db = await openVaultDB();
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const req = tx.objectStore(STORE_NAME).get(`${userId}_${testId}`);
                req.onsuccess = () => resolve(req.result ? { answers: req.result.answers, savedAt: req.result.savedAt } : null);
                req.onerror = () => reject(req.error);
            });
        } catch (e) {
            console.warn('[AnswerVault] load failed:', e);
            return null;
        }
    },

    /**
     * Remove backup after successful submission.
     */
    async clear(userId: string, testId: string): Promise<void> {
        try {
            const db = await openVaultDB();
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).delete(`${userId}_${testId}`);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (e) {
            console.warn('[AnswerVault] clear failed:', e);
        }
    },
};


// ─── 3. PROACTIVE TOKEN REFRESHER ────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 45 * 60 * 1000; // 45 minutes

/**
 * Starts a background interval that silently refreshes the Supabase JWT
 * every 45 minutes. This prevents the token from expiring during a 2-3 hour exam.
 *
 * @returns A cleanup function — call it on exam end / unmount.
 */
export function startProactiveTokenRefresh(apiBaseUrl: string): () => void {
    const intervalId = setInterval(async () => {
        try {
            const refreshToken = localStorage.getItem('testoza_refresh_token');
            if (!refreshToken) return;

            const res = await fetch(`${apiBaseUrl}auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (!res.ok) {
                console.warn('[TokenRefresh] Refresh failed with status:', res.status);
                return;
            }

            const data = await res.json();
            const session = data?.data?.session;

            if (session?.access_token) {
                localStorage.setItem('testoza_token', session.access_token);
                if (session.refresh_token) {
                    localStorage.setItem('testoza_refresh_token', session.refresh_token);
                }
                console.log('[TokenRefresh] Token refreshed proactively ✓');
            }
        } catch (e) {
            // Non-fatal: next refresh will try again
            console.warn('[TokenRefresh] Proactive refresh error:', e);
        }
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
}

export const IndexedDBStorage = {
    async getItem(key: string): Promise<any | null> {
        try {
            const db = await openVaultDB();
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(KV_STORE_NAME, 'readonly');
                const req = tx.objectStore(KV_STORE_NAME).get(key);
                req.onsuccess = () => resolve(req.result ? req.result.value : null);
                req.onerror = () => reject(req.error);
            });
        } catch (e) {
            console.warn('[IndexedDBStorage] getItem failed:', e);
            return null;
        }
    },

    async setItem(key: string, value: any): Promise<void> {
        try {
            const db = await openVaultDB();
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(KV_STORE_NAME, 'readwrite');
                tx.objectStore(KV_STORE_NAME).put({ key, value, savedAt: new Date().toISOString() });
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (e) {
            console.warn('[IndexedDBStorage] setItem failed:', e);
        }
    },

    async removeItem(key: string): Promise<void> {
        try {
            const db = await openVaultDB();
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(KV_STORE_NAME, 'readwrite');
                tx.objectStore(KV_STORE_NAME).delete(key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (e) {
            console.warn('[IndexedDBStorage] removeItem failed:', e);
        }
    }
};
