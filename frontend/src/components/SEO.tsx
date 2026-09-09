import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title: string;
    description?: string;
    url?: string;
    image?: string;
    type?: string;
    categories?: string[];
    siteName?: string;
    keywords?: string[];
    canonicalUrl?: string;
    schemas?: any[];     // Array of JSON-LD schema objects
    noindex?: boolean;   // For admin/private pages
}

const DEFAULT_IMAGE = "https://testoza.com/default-og.png";
const SITE_URL = "https://testoza.com";
const DEFAULT_SITE_NAME = "TestoZa";

export const SEO: React.FC<SEOProps> = ({
    title,
    description = "Create, conduct, and manage online tests with AI. TestoZa is the best free test maker for teachers, educators, and coaching institutes — generate quizzes from PDFs, text, or YouTube.",
    url,
    image,
    type = 'website',
    categories = [],
    siteName = DEFAULT_SITE_NAME,
    keywords = [],
    canonicalUrl,
    schemas = [],
    noindex = false
}) => {
    const fullTitle = title ? `${title} | ${siteName}` : `${siteName} - AI Test Maker`;
    const metaImage = image || DEFAULT_IMAGE;

    // Ensure URL is absolute if provided, otherwise use current path on the main domain to consolidate indexing authority.
    const metaUrl = url 
        ? (url.startsWith('http') ? url : `${SITE_URL}${url}`) 
        : `${SITE_URL}${window.location.pathname}${window.location.search}`;
    const finalCanonicalUrl = canonicalUrl || metaUrl;

    // Build description including categories if relevant
    let finalDescription = description;
    if (categories && categories.length > 0) {
        finalDescription += ` | Topics: ${categories.join(', ')}`;
    }

    // Default keywords if none provided
    const finalKeywords = keywords.length > 0
        ? keywords.join(', ')
        : "online test maker for teachers, AI quiz generator, create test from PDF, free online exam software, assessment platform for educators, TestoZa";

    return (
        <Helmet>
            {/* Standard Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="description" content={finalDescription} />
            <meta name="author" content="TestoZa Team" />
            <link rel="canonical" href={finalCanonicalUrl} />

            {noindex && <meta name="robots" content="noindex, nofollow" />}

            {/* Open Graph Tags */}
            <meta property="og:title" content={title || siteName} />
            <meta property="og:description" content={finalDescription} />
            <meta property="og:type" content={type} />
            <meta property="og:url" content={metaUrl} />
            <meta property="og:image" content={metaImage} />
            <meta property="og:site_name" content={siteName} />

            {/* Twitter Card Tags */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title || siteName} />
            <meta name="twitter:description" content={finalDescription} />
            <meta name="twitter:image" content={metaImage} />

            {/* Structured Data (JSON-LD) */}
            {schemas.map((schema, index) => (
                <script key={index} type="application/ld+json">
                    {JSON.stringify(schema)}
                </script>
            ))}
        </Helmet>
    );
};
