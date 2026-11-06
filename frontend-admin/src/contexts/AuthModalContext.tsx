/**
 * Admin stand-in for the user app's AuthModalContext.
 *
 * The builder and AI importer are copied from frontend/ and call useAuthModal().openAuthModal()
 * when nobody is signed in. Admin has no sign-in pop-up — every admin page sits behind /login —
 * so this keeps the same API and sends the person to /login, returning them afterwards.
 */
export interface OpenAuthModalOptions {
    view?: 'login' | 'signup' | 'forgot' | 'onboarding';
    redirectPath?: string;
    onSuccess?: () => void;
}

function openAuthModal(options?: OpenAuthModalOptions | 'login' | 'signup' | 'onboarding') {
    const redirectPath = typeof options === 'object' ? options.redirectPath : undefined;
    try {
        localStorage.setItem('auth_redirect_intent', redirectPath || `${window.location.pathname}${window.location.search}`);
    } catch { /* storage blocked */ }
    window.location.assign('/login');
}

const value = {
    openAuthModal,
    openOnboardingModal: (_onSuccess?: () => void) => openAuthModal(),
    closeAuthModal: () => {},
};

export const useAuthModal = () => value;
