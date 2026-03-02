import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';

export default function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('nkc_privacy_consent');
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    const accept = () => {
        localStorage.setItem('nkc_privacy_consent', 'accepted');
        setIsVisible(false);
    };

    const decline = () => {
        localStorage.setItem('nkc_privacy_consent', 'declined');
        // If they explicitly decline, we can set Do Not Track for our tracker
        (navigator as any).doNotTrack = '1';
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900 text-white z-50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="pr-4">
                <p className="text-sm">
                    We use anonymous browser fingerprints to analyze traffic and improve the platform.
                    No PII or cookies are used for analytics tracking.
                </p>
                <a href="/privacy-policy" className="text-xs text-blue-300 hover:text-blue-100 underline mt-1 block">
                    Learn more in our Privacy Policy
                </a>
            </div>
            <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={decline} className="text-slate-900">
                    Decline
                </Button>
                <Button size="sm" onClick={accept} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Accept
                </Button>
            </div>
        </div>
    );
}
