import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * Cloudflare Turnstile React Hook
 * 
 * Usage:
 *   const { turnstileRef, getToken, resetTurnstile, isReady } = useTurnstile();
 *   
 *   // In your JSX, place the widget container:
 *   <div ref={turnstileRef} />
 *   
 *   // Before form submission:
 *   const token = await getToken();
 *   // Send token to backend as `turnstile_token`
 * 
 * Turnstile "managed" mode:
 *   - Invisible for normal users (no interaction needed)
 *   - Shows a challenge ONLY when Cloudflare detects suspicious behavior
 *   - Perfect for mass exam scenario (500+ students on same WiFi pass invisibly)
 */

// Site key — set via env var. Use Cloudflare's test keys for development.
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAD_RPdiOqoUwwBEw';

declare global {
    interface Window {
        turnstile?: {
            render: (container: HTMLElement, options: any) => string;
            reset: (widgetId: string) => void;
            getResponse: (widgetId: string) => string | undefined;
            remove: (widgetId: string) => void;
        };
    }
}

export function useTurnstile() {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const tokenRef = useRef<string>('');
    const [isReady, setIsReady] = useState(false);

    // Render the widget once the container and Turnstile script are both available
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const renderWidget = () => {
            if (!window.turnstile || widgetIdRef.current) return;

            try {
                widgetIdRef.current = window.turnstile.render(container, {
                    sitekey: TURNSTILE_SITE_KEY,
                    theme: 'auto',
                    size: 'flexible',
                    action: 'turnstile-spin-v2',
                    'data-action': 'turnstile-spin-v2',
                    callback: (token: string) => {
                        tokenRef.current = token;
                        setIsReady(true);
                    },
                    'expired-callback': () => {
                        tokenRef.current = '';
                        setIsReady(false);
                    },
                    'error-callback': () => {
                        tokenRef.current = '';
                        setIsReady(false);
                    },
                });
            } catch (e) {
                // Turnstile not loaded yet, will retry
            }
        };

        // If Turnstile is already loaded, render immediately
        if (window.turnstile) {
            renderWidget();
        } else {
            // Poll for Turnstile to load (it's async defer)
            const interval = setInterval(() => {
                if (window.turnstile) {
                    clearInterval(interval);
                    renderWidget();
                }
            }, 200);

            return () => clearInterval(interval);
        }

        return () => {
            if (widgetIdRef.current && window.turnstile) {
                try {
                    window.turnstile.remove(widgetIdRef.current);
                } catch (e) { /* ignore */ }
                widgetIdRef.current = null;
            }
        };
    }, []);

    const getToken = useCallback((): string => {
        // Try to get the latest response directly from the widget
        if (widgetIdRef.current && window.turnstile) {
            const response = window.turnstile.getResponse(widgetIdRef.current);
            if (response) return response;
        }
        return tokenRef.current;
    }, []);

    const resetTurnstile = useCallback(() => {
        if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
            tokenRef.current = '';
            setIsReady(false);
        }
    }, []);

    return {
        turnstileRef: containerRef,
        getToken,
        resetTurnstile,
        isReady,
    };
}
