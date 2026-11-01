/**
 * The Google sign-in popup (hooks/useAuthActions.ts → signInWithGoogle).
 *
 * Supabase returns every sign-in through https://testoza.com (the project's Site
 * URL), and the Cross-Origin-Opener-Policy header there cuts the popup off from the
 * page that opened it, so window.opener can't be relied on. signInWithGoogle sets a
 * cookie while its popup is open — on .testoza.com, not localStorage, because the
 * popup can start on testoza.com and finish on app.testoza.com.
 */
import { tokenStorage } from '@/utils/tokenStorage';

const SIGN_IN_POPUP_COOKIE = 'testoza_signin_popup';

export const markSignInPopup = (open: boolean) => {
    const domain = window.location.hostname.endsWith('testoza.com') ? '; domain=.testoza.com' : '';
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${SIGN_IN_POPUP_COOKIE}=${open ? '1' : ''}; path=/${domain}; max-age=${open ? 600 : 0}; SameSite=Lax${secure}`;
};

const hasSignInPopupMark = (): boolean =>
    document.cookie.split(';').some(c => c.trim() === `${SIGN_IN_POPUP_COOKIE}=1`);

/** True (once) when this window is the Google sign-in popup. */
export function takeSignInPopupMark(): boolean {
    const marked = hasSignInPopupMark();
    if (marked) markSignInPopup(false);
    return marked;
}

const hasLiveOpener = (): boolean => {
    try {
        return !!window.opener && !window.opener.closed;
    } catch {
        return false;
    }
};

/**
 * Runs in main.tsx before the app renders. In the sign-in popup it hands the login
 * to the page that opened it and closes the window, so the popup never loads the
 * app (and never waits for AuthContext's network calls). Returns false when this
 * isn't the popup and the app should render as usual.
 *
 * `renderApp` is the way out when the window can't be closed: a tab no script
 * opened, holding a leftover mark. The app's own /auth/callback flow then runs.
 */
export function finishSignInPopup(renderApp: () => void): boolean {
    const { hostname, pathname, search, hash } = window.location;
    const hashParams = new URLSearchParams(hash.slice(1));
    const accessToken = hashParams.get('access_token');
    const error = hashParams.get('error') || new URLSearchParams(search).get('error');
    if (!accessToken && !error) return false;

    // The stop on testoza.com: go straight on to the app's callback without loading
    // the home page. (The worker already 302s ?code= and ?error= returns there.)
    if (hostname === 'testoza.com' || hostname === 'www.testoza.com') {
        if (!hasSignInPopupMark() && !hasLiveOpener()) return false;
        window.location.replace(`https://app.testoza.com/auth/callback${search}${hash}`);
        return true;
    }

    if (!pathname.startsWith('/auth/callback')) return false;
    // Take the mark before storing the tokens: the opening page finishes as soon as
    // it sees a new token, and clears the mark when it does.
    const marked = takeSignInPopupMark();
    const hasOpener = hasLiveOpener();
    if (!marked && !hasOpener) return false;

    const refreshToken = hashParams.get('refresh_token') || undefined;
    if (accessToken) tokenStorage.setTokens(accessToken, refreshToken);

    if (hasOpener) {
        try {
            window.opener.postMessage(
                accessToken
                    ? { type: 'OAUTH_AUTH_SUCCESS', accessToken, refreshToken }
                    : {
                        type: 'OAUTH_AUTH_ERROR',
                        error: hashParams.get('error_description')
                            || new URLSearchParams(search).get('error_description')
                            || error
                    },
                window.location.origin
            );
        } catch (e) {
            console.error('[signInPopup] Failed to notify opener:', e);
        }
    }

    window.close();
    setTimeout(renderApp, 500);
    return true;
}
