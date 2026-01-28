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
}

const DEFAULT_IMAGE = "https://testoza.pages.dev/default-og.png"; // Fallback image provided in requirements

export const SEO: React.FC<SEOProps> = ({
    title,
    description = "Attempt this mock test on Answer Ace Lab with real exam experience.",
    url,
    image,
    type = 'website',
    categories = [],
    siteName = "Answer Ace Lab"
}) => {
    const fullTitle = title ? `${title} | ${siteName}` : siteName;
    const metaImage = image || DEFAULT_IMAGE;

    // Ensure URL is absolute if provided, otherwise use current location
    const metaUrl = url || window.location.href;

    // Format description: "Description | Categories: A, B | Site Name"
    let finalDescription = description || "Attempt this mock test.";

    // Clean up generic description if present to avoid duplication
    if (finalDescription === "Attempt this mock test on Answer Ace Lab with real exam experience.") {
        // Keep it as base
    }

    if (categories && categories.length > 0) {
        finalDescription += ` | Categories: ${categories.join(', ')}`;
    }
    finalDescription += ` | ${siteName}`;

    return (
        <Helmet>
            {/* Standard Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="description" content={finalDescription} />

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
        </Helmet>
    );
};
