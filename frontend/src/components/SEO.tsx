import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title: string;
    description?: string;
    url?: string;
    image?: string;
    type?: string;
}

const DEFAULT_IMAGE = "https://testoza.pages.dev/default-og.png"; // Fallback image provided in requirements

export const SEO: React.FC<SEOProps> = ({
    title,
    description = "Attempt this mock test on Answer Ace Lab with real exam experience.",
    url,
    image,
    type = 'website'
}) => {
    const siteTitle = "Answer Ace Lab";
    const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
    const metaImage = image || DEFAULT_IMAGE;

    // Ensure URL is absolute if provided, otherwise use current location
    const metaUrl = url || window.location.href;

    return (
        <Helmet>
            {/* Standard Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="description" content={description} />

            {/* Open Graph Tags */}
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:type" content={type} />
            <meta property="og:url" content={metaUrl} />
            <meta property="og:image" content={metaImage} />

            {/* Twitter Card Tags */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={metaImage} />
        </Helmet>
    );
};
