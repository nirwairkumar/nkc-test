import React from 'react';
import TestoZaLogo from '@/components/TestoZaLogo';

const HOME_URL = 'https://testoza.com/?utm_source=powered_by&utm_medium=result_page';

/**
 * "Powered by TestoZa" footer for the pages a candidate sees after submitting,
 * sized like the "Google Forms" mark at the foot of a form.
 * Opens in a new tab so the candidate's result (and the back guard) stays put.
 */
export default function PoweredByTestoZa({ className = '' }: { className?: string }) {
    return (
        <footer className={`w-full flex justify-center px-4 py-2.5 ${className}`}>
            <a
                href={HOME_URL}
                target="_blank"
                rel="noopener"
                aria-label="Powered by TestoZa"
                className="group inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-center transition-colors hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#056eab]/40"
            >
                <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Powered by</span>
                <TestoZaLogo size={19} />
            </a>
        </footer>
    );
}
