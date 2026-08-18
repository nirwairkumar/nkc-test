import React, { createContext, useContext, useState, useCallback } from 'react';

export type AuthModalView = 'login' | 'signup' | 'forgot' | 'onboarding';

export interface OpenAuthModalOptions {
    view?: 'login' | 'signup' | 'forgot' | 'onboarding';
    redirectPath?: string;
    onSuccess?: () => void;
}

interface AuthModalContextType {
    isAuthModalOpen: boolean;
    authModalView: AuthModalView;
    redirectPath?: string;
    onSuccessCallback?: () => void;
    openAuthModal: (options?: OpenAuthModalOptions | 'login' | 'signup') => void;
    closeAuthModal: () => void;
    setAuthModalView: (view: AuthModalView) => void;
    isOnboardingModalOpen: boolean;
    openOnboardingModal: (onSuccess?: () => void) => void;
    closeOnboardingModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType>({
    isAuthModalOpen: false,
    authModalView: 'login',
    openAuthModal: () => {},
    closeAuthModal: () => {},
    setAuthModalView: () => {},
    isOnboardingModalOpen: false,
    openOnboardingModal: () => {},
    closeOnboardingModal: () => {},
});

export const AuthModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalView, setAuthModalView] = useState<AuthModalView>('login');
    const [redirectPath, setRedirectPath] = useState<string | undefined>(undefined);
    const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | undefined>(undefined);

    const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
    const [onboardingSuccessCallback, setOnboardingSuccessCallback] = useState<(() => void) | undefined>(undefined);

    const openAuthModal = useCallback((options?: OpenAuthModalOptions | 'login' | 'signup') => {
        if (typeof options === 'string') {
            setAuthModalView(options);
            setRedirectPath(undefined);
            setOnSuccessCallback(undefined);
        } else if (options) {
            setAuthModalView(options.view || 'login');
            setRedirectPath(options.redirectPath);
            setOnSuccessCallback(() => options.onSuccess);
        } else {
            setAuthModalView('login');
            setRedirectPath(undefined);
            setOnSuccessCallback(undefined);
        }
        setIsAuthModalOpen(true);
    }, []);

    const closeAuthModal = useCallback(() => {
        setIsAuthModalOpen(false);
    }, []);

    const openOnboardingModal = useCallback((onSuccess?: () => void) => {
        setOnboardingSuccessCallback(() => onSuccess);
        setIsOnboardingModalOpen(true);
    }, []);

    const closeOnboardingModal = useCallback(() => {
        setIsOnboardingModalOpen(false);
    }, []);

    return (
        <AuthModalContext.Provider
            value={{
                isAuthModalOpen,
                authModalView,
                redirectPath,
                onSuccessCallback,
                openAuthModal,
                closeAuthModal,
                setAuthModalView,
                isOnboardingModalOpen,
                openOnboardingModal,
                closeOnboardingModal,
            }}
        >
            {children}
        </AuthModalContext.Provider>
    );
};

export const useAuthModal = () => useContext(AuthModalContext);
