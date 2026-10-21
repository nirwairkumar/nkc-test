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
        <footer className={`w-full flex justify-center px-4 pt-10 pb-6 ${className}`}>
            <a
                href={HOME_URL}
                target="_blank"
                rel="noopener"
                aria-label="Powered by TestoZa. Create your own free test."
                className="group flex flex-col items-center gap-1.5 rounded-2xl px-5 py-3 text-center transition-colors hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#056eab]/40"
            >
                <span className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Powered by</span>
                    <TestoZaLogo size={30} />
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 transition-colors group-hover:text-[#056eab] dark:group-hover:text-[#38bdf8]">
                    Create your own test for free
                </span>
            </a>
        </footer>
    );
}
