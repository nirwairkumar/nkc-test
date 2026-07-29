import React from 'react';

interface TestoZaLogoProps {
    size?: number;
    showText?: boolean;
    className?: string;
}

/**
 * Premium Stylized TestoZa Logo Text
 * Renders "TestoZa" with:
 * 1. "Testo" and "a" in a premium bluish-teal color matching the platform
 * 2. "Z" in a distinct, larger orange-copper gradient matching the logo image
 * 3. Modern, geometric 'Outfit' sans-serif typography
 */
export default function TestoZaLogo({ size = 36, showText = true, className = '' }: TestoZaLogoProps) {
    if (!showText) return null;

    // Font sizing optimized for navbar heights
    const baseFontSize = size * 0.72;

    return (
        <span
            className={`inline-flex items-baseline font-outfit select-none tracking-tight ${className}`}
            style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: `${baseFontSize}px`,
                fontWeight: 700,
                lineHeight: 1,
            }}
        >
            {/* "Testo" in premium vibrant blue matching the platform */}
            <span className="text-[#056eab] dark:text-[#38bdf8] transition-colors duration-200">
                Testo
            </span>
            
            {/* "Z" in a taller, bold metallic gold gradient with a soft gold glow */}
            <span
                className="bg-gradient-to-b from-[#FFE885] via-[#F4B838] to-[#9E6400] bg-clip-text text-transparent inline-block"
                style={{
                    fontSize: '1.26em',
                    fontWeight: 900,
                    marginRight: '0.02em',
                    marginLeft: '0.02em',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.15)) drop-shadow(0 0 6px rgba(244, 184, 56, 0.45))',
                }}
            >
                Z
            </span>
            
            {/* "a" in premium vibrant blue matching the platform */}
            <span className="text-[#056eab] dark:text-[#38bdf8] transition-colors duration-200">
                a
            </span>
        </span>
    );
}

