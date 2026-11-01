/**
 * testoza.com/support: the public Help page (footer, PDF tools, signed-out navbar).
 * Same parts as the in-app /help (components/help); here we ask for name and email.
 */
import React from 'react';
import { SEO } from '@/components/SEO';
import HelpCenter from '@/components/help/HelpCenter';
import { HELP_FAQS } from '@/components/help/helpFaq';
import { REPLY_PROMISE } from '@/lib/helpContact';

export default function SupportPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            <SEO
                title="Help & Support - TestoZa"
                description="Get help with TestoZa: write to us, chat on WhatsApp, or read answers to common questions about creating and conducting online tests."
                keywords={["testoza support", "contact us", "help center", "customer care"]}
                schemas={[{
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    "mainEntity": HELP_FAQS.map(f => ({
                        "@type": "Question",
                        "name": f.q,
                        "acceptedAnswer": { "@type": "Answer", "text": f.a }
                    }))
                }]}
            />
            <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
                <header className="mb-6">
                    <p className="text-[12px] font-medium uppercase leading-none tracking-widest text-slate-400">Support</p>
                    <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 sm:text-[32px]">Help &amp; Support</h1>
                    <p className="mt-1.5 text-[15px] text-slate-600">Write to us or WhatsApp us. {REPLY_PROMISE}</p>
                </header>
                <HelpCenter />
            </div>
        </div>
    );
}
