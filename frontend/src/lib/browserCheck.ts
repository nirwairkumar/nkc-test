/**
 * Browser Compatibility & Storage Diagnostic Helper for TestoZa
 * Used prior to starting live exams.
 */

export interface SystemCheckResult {
    browserSupported: boolean;
    browserName: string;
    fullscreenSupported: boolean;
    storageSupported: boolean;
    isOnline: boolean;
    freedStorageKB: number;
    details: string[];
}

export function runBrowserDiagnosticsAndVacateStorage(): SystemCheckResult {
    const details: string[] = [];
    let freedBytes = 0;

    // 1. Browser Detection
    const ua = navigator.userAgent;
    let browserName = "Unknown Browser";
    if (ua.includes("Chrome") && !ua.includes("Edg")) browserName = "Google Chrome";
    else if (ua.includes("Edg")) browserName = "Microsoft Edge";
    else if (ua.includes("Firefox")) browserName = "Mozilla Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browserName = "Apple Safari";

    const browserSupported = Boolean(
        window.fetch && 
        window.Promise && 
        window.localStorage &&
        window.indexedDB
    );

    if (browserSupported) {
        details.push(`${browserName} is fully compatible.`);
    } else {
        details.push("Outdated browser detected. Please upgrade your browser.");
    }

    // 2. Fullscreen Support Check
    const docEl = document.documentElement as any;
    const fullscreenSupported = Boolean(
        docEl.requestFullscreen ||
        docEl.webkitRequestFullscreen ||
        docEl.mozRequestFullScreen ||
        docEl.msRequestFullscreen
    );

    if (fullscreenSupported) {
        details.push("Fullscreen API is supported.");
    } else {
        details.push("Fullscreen API not supported on this device/browser.");
    }

    // 3. Online Check
    const isOnline = navigator.onLine;
    if (isOnline) {
        details.push("Network connection active.");
    } else {
        details.push("Device is currently offline.");
    }

    // 4. Storage Vacate (Clear stale exam drafts to free memory)
    const storageSupported = Boolean(window.localStorage);
    if (storageSupported) {
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key) continue;
                
                // Vacate stale exam responses, cached payloads, or temp test states
                if (
                    key.startsWith("temp_test_") ||
                    key.startsWith("draft_attempt_") ||
                    key.startsWith("stale_response_") ||
                    key.startsWith("offline_queue_")
                ) {
                    const itemValue = localStorage.getItem(key) || "";
                    freedBytes += key.length + itemValue.length;
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach(key => localStorage.removeItem(key));
            const freedKB = Math.round(freedBytes / 1024);
            details.push(`Storage checked. Vacated ${keysToRemove.length} stale draft cache item(s) (${freedKB} KB).`);
        } catch (e) {
            console.warn("Storage cleanup notice:", e);
        }
    }

    return {
        browserSupported,
        browserName,
        fullscreenSupported,
        storageSupported,
        isOnline,
        freedStorageKB: Math.round(freedBytes / 1024),
        details
    };
}
