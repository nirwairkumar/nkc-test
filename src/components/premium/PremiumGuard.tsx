import React, { useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PremiumModal from './PremiumModal';

interface PremiumGuardProps {
    children: ReactNode;
    fallback?: ReactNode; // Optional: Show this if not premium (visually), but usually we want to intercept interactions
    triggerReason?: string;
    asChild?: boolean; // If true, just clone child? (More complex). Let's keep distinct wrapper.
    className?: string;
}

export default function PremiumGuard({ children, fallback, triggerReason, className }: PremiumGuardProps) {
    const { isAdmin, isPremium } = useAuth(); // Assume isAdmin also bypasses? Usually yes.
    const [showModal, setShowModal] = useState(false);

    // If premium, just render children
    // Wait, requirement is: "click on any pro feature ... pop up should show"
    // So we render the feature, but intercept click.

    // Check if we have access
    const hasAccess = isPremium || isAdmin;

    const handleClick = (e: React.MouseEvent) => {
        if (!hasAccess) {
            e.stopPropagation();
            e.preventDefault();
            setShowModal(true);
        }
    };

    // If we want to block interaction completely via overlay:
    if (!hasAccess) {
        return (
            <>
                <div onClick={handleClick} className={`relative cursor-pointer ${className}`}>
                    {/* Render children but maybe disable inputs? */}
                    {/* A transparent overlay to catch clicks is safest for disabling underlying inputs */}
                    <div className="absolute inset-0 z-10" />
                    <div className="opacity-80 pointer-events-none select-none grayscale-[0.5]">
                        {children}
                    </div>
                </div>
                <PremiumModal
                    open={showModal}
                    onOpenChange={setShowModal}
                    triggerReason={triggerReason}
                />
            </>
        );
    }

    return <>{children}</>;
}


export function usePremiumLock() {
    const { isAdmin, isPremium } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const hasAccess = isPremium || isAdmin;

    const checkPremium = (action: () => void) => {
        if (hasAccess) {
            action();
        } else {
            setIsModalOpen(true);
        }
    };

    const PremiumModalComponent = () => (
        <PremiumModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    );

    return { checkPremium, PremiumModalComponent, hasAccess };
}
