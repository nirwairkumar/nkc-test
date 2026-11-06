// src/utils/safeStorage.ts
/**
 * Industry-Grade Browser Storage Management for TestoZa Platform
 * - Protects against QuotaExceededError (DOMException 22)
 * - Automatically purges stale transient caches from localStorage
 * - Redirects heavy/temporary API test object caches to sessionStorage
 */

export function cleanupStorageQuota(): void {
    if (typeof window === 'undefined') return;

    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                // Clear transient heavy test caches and temporary states from persistent localStorage
                if (
                    key.startsWith('test_cache_') ||
                    key.startsWith('confetti_shown_') ||
                    key.startsWith('feedback_popup_shown_') ||
                    key.startsWith('test_session_') ||
                    key.startsWith('guest_ai_') ||
                    key.startsWith('pricing_') ||
                    key.startsWith('features_')
                ) {
                    keysToRemove.push(key);
                }
            }
        }

        keysToRemove.forEach(k => {
            try {
                localStorage.removeItem(k);
            } catch {}
        });

        if (keysToRemove.length > 0) {
            console.log(`[StorageManager] Auto-cleansed ${keysToRemove.length} transient items from localStorage.`);
        }
    } catch (e) {
        console.warn('[StorageManager] Error during storage cleanup:', e);
    }
}

export const safeLocalStorage = {
    getItem: (key: string): string | null => {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    },
    setItem: (key: string, value: string): boolean => {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.warn(`[StorageManager] localStorage quota reached while saving "${key}". Triggering auto-purge...`);
            cleanupStorageQuota();
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (retryErr) {
                console.error(`[StorageManager] localStorage write failed for key "${key}" after purge:`, retryErr);
                return false;
            }
        }
    },
    removeItem: (key: string): void => {
        try {
            localStorage.removeItem(key);
        } catch {}
    }
};

export const safeSessionStorage = {
    getItem: (key: string): string | null => {
        try {
            return sessionStorage.getItem(key);
        } catch {
            return null;
        }
    },
    setItem: (key: string, value: string): boolean => {
        try {
            sessionStorage.setItem(key, value);
            return true;
        } catch (e) {
            try {
                // Evict oldest test_cache entries from sessionStorage if full
                for (let i = 0; i < sessionStorage.length; i++) {
                    const k = sessionStorage.key(i);
                    if (k && k.startsWith('test_cache_')) {
                        sessionStorage.removeItem(k);
                    }
                }
                sessionStorage.setItem(key, value);
                return true;
            } catch {
                return false;
            }
        }
    },
    removeItem: (key: string): void => {
        try {
            sessionStorage.removeItem(key);
        } catch {}
    }
};
