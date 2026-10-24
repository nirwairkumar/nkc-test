/**
 * app.testoza.com/feedback: the sidebar's "Feedback". One card, three short parts, Submit.
 * Whatever was typed in the pop-up after stopping an exam (and minimised) is already here.
 * Read in admin → Support → Feedback.
 */
import React from 'react';
import { SEO } from '@/components/SEO';
import FeedbackCard from '@/components/feedback/FeedbackCard';

export default function FeedbackPage() {
    return (
        <div className="mx-auto w-full max-w-xl px-4 pb-16 pt-6 sm:px-6 sm:pt-12">
            <SEO title="Feedback - TestoZa" description="Tell the TestoZa team what works and what doesn't." noindex />
            <header className="mb-5 px-1">
                <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-slate-900 dark:text-slate-100 sm:text-[30px]">Feedback</h1>
                <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500">
                    A line or two is plenty. Fill any part you like.
                </p>
            </header>
            <FeedbackCard origin={{ source: 'sidebar' }} autoFocus={false} />
        </div>
    );
}
