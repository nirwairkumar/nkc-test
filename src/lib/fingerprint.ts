/**
 * Generates a privacy-respecting browser fingerprint.
 * Combines screen, platform, and other non-PII signals and hashes them.
 */
export async function generateFingerprint(): Promise<string> {
    const components: string[] = [
        window.screen.width.toString(),
        window.screen.height.toString(),
        window.screen.colorDepth.toString(),
        new Date().getTimezoneOffset().toString(),
        navigator.language || 'unknown',
        navigator.hardwareConcurrency?.toString() || 'unknown',
        (navigator as any).deviceMemory?.toString() || 'unknown',
    ];

    const rawString = components.join('|');
    return await sha256(rawString);
}

async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}
