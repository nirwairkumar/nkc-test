/**
 * TestoZa homepage.
 *
 * Rebuilt from the V2 design that was reviewed in Admin → Testing Tools.
 * Addresses the findings in LANDING_PAGE_AUDIT.md:
 *
 *   C1  one static, keyword-aligned <h1> (the old hero rotated four slogans
 *       through the <h1>, none containing a target keyword, and Google scores
 *       the rendered DOM rather than the static fallback)
 *   C2  a real hero subheadline (the old one rendered `&nbsp;`)
 *   C3  internal links out to the keyword landing pages, which were orphaned
 *       — reachable only via sitemap. The bulk of that link equity now flows
 *       through the shared Footer, so every page carries it, not just this one
 *   C4  proof sits directly under the hero instead of ~6,000px down
 *   M1  the product category is named in the first line
 *   M4  one dominant CTA rather than three competing equally
 *   P3  a concrete hero visual gives a stable, optimisable LCP element
 *
 * Structural notes:
 *   • No <Navbar> or <Footer> here. Layout.tsx renders both globally and
 *     decides per route where they appear; adding them again would duplicate.
 *   • Testimonials are intentionally not rendered — the component exists but
 *     holds placeholder quotes. Re-enable only with real, permissioned ones.
 *   • The previous implementation's components under components/landing/ are
 *     left untouched; SectionWiseBuilderShowcase is still used by TestList.
 */

import { useEffect } from 'react';
import { SEO } from '@/components/SEO';
import { getAppUrl } from '@/utils/subdomain';

import LandingV2Nav from '@/components/landing-v2/LandingV2Nav';
import LandingV2Hero from '@/components/landing-v2/LandingV2Hero';
import {
    FeatureDeepDives,
    HowItWorks,
    ProofBand,
    QuestionTypesStrip,
    ValueProps,
} from '@/components/landing-v2/LandingV2Sections';
import {
    Comparison,
    Faq,
    FinalCta,
} from '@/components/landing-v2/LandingV2Closing';
import { FAQS, HERO } from '@/components/landing-v2/content';

/* ── Structured data ──────────────────────────────────────────────────────
   Built from the same FAQS array the page renders, so the markup and the
   schema can never drift apart — Google penalises FAQ schema that does not
   match visible content.                                                   */

const homepageFAQSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
};

const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'TestoZa',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    description: HERO.sub,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    // aggregateRating deliberately omitted — publishing one without real
    // reviews is a structured-data violation.
};

export default function LandingPage() {
    useEffect(() => {
        document.documentElement.style.scrollBehavior = 'smooth';

        // WebMCP tool registration for agentic browsers. Carried over verbatim
        // from the previous homepage — this is how AI agents discover that the
        // page can generate a test.
        const registerWebMCPTools = () => {
            const modelContext =
                (document as any).modelContext ||
                (navigator as any).modelContext;

            if (modelContext && typeof modelContext.registerTool === 'function') {
                try {
                    modelContext.registerTool({
                        name: 'create_test_from_topic',
                        description:
                            'Generates an assessment or test on a specific academic subject, topic, or chapter for teachers.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                topic: {
                                    type: 'string',
                                    description:
                                        'The academic subject, chapter, or topic to generate questions for.',
                                },
                                numQuestions: {
                                    type: 'number',
                                    description:
                                        'Number of questions to generate (default is 10).',
                                },
                            },
                            required: ['topic'],
                        },
                        execute: async ({
                            topic,
                            numQuestions = 10,
                        }: {
                            topic: string;
                            numQuestions?: number;
                        }) => {
                            window.location.href = getAppUrl(
                                `/create-test?topic=${encodeURIComponent(topic)}&num=${numQuestions}`,
                            );
                            return `Redirecting to test creation page for topic "${topic}" with ${numQuestions} questions.`;
                        },
                    });
                } catch (err) {
                    console.warn('Failed to register WebMCP tool:', err);
                }
            }
        };

        registerWebMCPTools();

        return () => {
            document.documentElement.style.scrollBehavior = 'auto';
        };
    }, []);

    return (
        <>
            <SEO
                title="Free Online Test Maker – Create & Conduct Exams with AI"
                description="Create and conduct online exams with AI. Generate quizzes from PDFs, YouTube videos, or plain text in minutes — auto-graded, proctored, and free for unlimited students."
                canonicalUrl="https://testoza.com/"
                schemas={[homepageFAQSchema, softwareSchema]}
            />

            <div className="min-h-screen bg-white font-[Outfit,system-ui,sans-serif] antialiased dark:bg-slate-950">
                <LandingV2Nav />
                <LandingV2Hero />
                <ProofBand />
                <ValueProps />
                <HowItWorks />
                <FeatureDeepDives />
                <QuestionTypesStrip />
                <Comparison />
                {/* Testimonials intentionally disabled — placeholder quotes only. */}
                <Faq />
                <FinalCta />
            </div>
        </>
    );
}
