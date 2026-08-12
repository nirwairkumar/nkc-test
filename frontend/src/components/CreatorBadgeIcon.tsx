import React from 'react';

interface CreatorBadgeIconProps {
    level: number;
    className?: string;
    size?: number;
    locked?: boolean;
}

export const CreatorBadgeIcon: React.FC<CreatorBadgeIconProps> = ({
    level,
    className = "w-28 h-28",
    size = 160,
    locked = false
}) => {
    const opacityClass = locked ? "grayscale opacity-50 contrast-75" : "";

    // Helper for 12-Scallop Rosette Outer Frame
    const renderScallopedRosette = (gradId: string) => {
        const center = { x: 100, y: 78 };
        const dist = 54;
        const r = 14.5;
        const lobes = [];
        for (let i = 0; i < 12; i++) {
            const angle = (i * 30 * Math.PI) / 180;
            const cx = center.x + dist * Math.cos(angle);
            const cy = center.y + dist * Math.sin(angle);
            lobes.push(<circle key={i} cx={cx.toFixed(1)} cy={cy.toFixed(1)} r={r} fill={`url(#${gradId})`} />);
        }
        return (
            <g id={`rosette_${gradId}`}>
                {lobes}
                <circle cx={center.x} cy={center.y} r={dist} fill={`url(#${gradId})`} />
            </g>
        );
    };

    // Helper for Laurel Branches
    const renderLaurels = (leafGradId: string) => (
        <g id="laurels">
            {/* Left Laurel */}
            <path d="M54 85 Q46 64 62 44" stroke={`url(#${leafGradId})`} strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M54 82 Q46 80 50 74 Q56 78 54 82 Z" fill={`url(#${leafGradId})`} />
            <path d="M51 72 Q43 68 49 62 Q54 67 51 72 Z" fill={`url(#${leafGradId})`} />
            <path d="M50 60 Q43 54 51 50 Q55 56 50 60 Z" fill={`url(#${leafGradId})`} />
            <path d="M54 50 Q50 42 59 40 Q60 47 54 50 Z" fill={`url(#${leafGradId})`} />

            {/* Right Laurel */}
            <path d="M146 85 Q154 64 138 44" stroke={`url(#${leafGradId})`} strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M146 82 Q154 80 150 74 Q144 78 146 82 Z" fill={`url(#${leafGradId})`} />
            <path d="M149 72 Q157 68 151 62 Q146 67 149 72 Z" fill={`url(#${leafGradId})`} />
            <path d="M150 60 Q157 54 149 50 Q145 56 150 60 Z" fill={`url(#${leafGradId})`} />
            <path d="M146 50 Q150 42 141 40 Q140 47 146 50 Z" fill={`url(#${leafGradId})`} />
        </g>
    );

    // Helper for 5-Point Star
    const renderStar = (cx: number, cy: number, r: number, fillGrad: string) => {
        const points = [];
        for (let i = 0; i < 5; i++) {
            const aOuter = ((i * 72 - 90) * Math.PI) / 180;
            const aInner = (((i + 0.5) * 72 - 90) * Math.PI) / 180;
            points.push(`${cx + r * Math.cos(aOuter)},${cy + r * Math.sin(aOuter)}`);
            points.push(`${cx + (r * 0.45) * Math.cos(aInner)},${cy + (r * 0.45) * Math.sin(aInner)}`);
        }
        return <polygon points={points.join(' ')} fill={`url(#${fillGrad})`} />;
    };

    switch (level) {
        case 1:
            // LEVEL 1: VERIFIED CREATOR - Bronze Rosette, Midnight Blue Center, Shield Accent, Serif 'T'
            return (
                <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} ${opacityClass}`}>
                    <defs>
                        <linearGradient id="bronze_metal" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#E29567" />
                            <stop offset="35%" stopColor="#C06C38" />
                            <stop offset="70%" stopColor="#8A4219" />
                            <stop offset="100%" stopColor="#5C2B0E" />
                        </linearGradient>
                        <linearGradient id="bronze_gold" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#FDE68A" />
                            <stop offset="50%" stopColor="#D97706" />
                            <stop offset="100%" stopColor="#92400E" />
                        </linearGradient>
                    </defs>

                    {/* Folded Hanging Ribbon Tails */}
                    <g id="ribbon_tails_v">
                        <path d="M60 120 L40 178 L65 163 L88 178 L78 120 Z" fill="url(#bronze_metal)" />
                        <path d="M140 120 L112 178 L135 163 L160 178 L122 120 Z" fill="#6A2E10" />
                    </g>

                    {/* 12-Scallop Rosette Frame */}
                    {renderScallopedRosette('bronze_metal')}

                    {/* Concentric Metallic Ring & Dark Blue Center */}
                    <circle cx="100" cy="78" r="56" fill="url(#bronze_metal)" stroke="#FDE68A" strokeWidth="1.5" />
                    <circle cx="100" cy="78" r="50" fill="#0A1128" stroke="#8A4219" strokeWidth="2" />

                    {/* Laurels */}
                    {renderLaurels('bronze_gold')}

                    {/* Top Accent: Shield with Star */}
                    <g transform="translate(100, 36) scale(0.9)">
                        <path d="M0 -8 L8 -4 L8 4 Q0 10 0 10 Q0 10 -8 4 L-8 -4 Z" fill="url(#bronze_gold)" stroke="#FFF" strokeWidth="0.8" />
                        {renderStar(0, 0, 3.5, 'bronze_gold')}
                    </g>

                    {/* Center Serif 'T' Emblem */}
                    <text x="100" y="100" fontSize="56" fontWeight="900" fontFamily="Georgia, 'Times New Roman', Times, serif" fill="url(#bronze_gold)" textAnchor="middle" style={{ filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.8))' }}>
                        T
                    </text>

                    {/* Level Banner Pill */}
                    <rect x="52" y="136" width="96" height="24" rx="6" fill="#0A1128" stroke="#1E293B" strokeWidth="1.5" />
                    <text x="100" y="152" fontSize="12" fontWeight="900" fontFamily="Inter, sans-serif" fill="#FFFFFF" textAnchor="middle" letterSpacing="1.5">
                        LEVEL 1
                    </text>
                </svg>
            );

        case 2:
            // LEVEL 2: TRUSTED CREATOR - Copper Rosette, 2 Stars Top, Serif 'T', Vertical Ribbon Tails
            return (
                <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} ${opacityClass}`}>
                    <defs>
                        <linearGradient id="copper_metal" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ED9B6E" />
                            <stop offset="40%" stopColor="#C86A39" />
                            <stop offset="80%" stopColor="#8C3F1B" />
                            <stop offset="100%" stopColor="#5E260D" />
                        </linearGradient>
                        <linearGradient id="copper_gold" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#FFEDD5" />
                            <stop offset="50%" stopColor="#F97316" />
                            <stop offset="100%" stopColor="#9A3412" />
                        </linearGradient>
                    </defs>

                    {/* Folded Hanging Ribbon Tails */}
                    <g id="ribbon_tails_v">
                        <path d="M60 120 L40 178 L65 163 L88 178 L78 120 Z" fill="url(#copper_metal)" />
                        <path d="M140 120 L112 178 L135 163 L160 178 L122 120 Z" fill="#6E2B0D" />
                    </g>

                    {/* 12-Scallop Rosette Frame */}
                    {renderScallopedRosette('copper_metal')}

                    {/* Concentric Metallic Ring & Dark Blue Center */}
                    <circle cx="100" cy="78" r="56" fill="url(#copper_metal)" stroke="#FFEDD5" strokeWidth="1.5" />
                    <circle cx="100" cy="78" r="50" fill="#0A1128" stroke="#8C3F1B" strokeWidth="2" />

                    {/* Laurels */}
                    {renderLaurels('copper_gold')}

                    {/* Top Accent: 2 Stars Side-by-Side */}
                    {renderStar(91, 38, 5, 'copper_gold')}
                    {renderStar(109, 38, 5, 'copper_gold')}

                    {/* Center Serif 'T' Emblem */}
                    <text x="100" y="100" fontSize="56" fontWeight="900" fontFamily="Georgia, 'Times New Roman', Times, serif" fill="url(#copper_gold)" textAnchor="middle" style={{ filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.8))' }}>
                        T
                    </text>

                    {/* Level Banner Pill */}
                    <rect x="52" y="136" width="96" height="24" rx="6" fill="#0A1128" stroke="#1E293B" strokeWidth="1.5" />
                    <text x="100" y="152" fontSize="12" fontWeight="900" fontFamily="Inter, sans-serif" fill="#FFFFFF" textAnchor="middle" letterSpacing="1.5">
                        LEVEL 2
                    </text>
                </svg>
            );

        case 3:
            // LEVEL 3: EXPERT CREATOR - Silver Rosette, 3 Stars Top, Silver Serif 'T', Vertical Ribbon Tails
            return (
                <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} ${opacityClass}`}>
                    <defs>
                        <linearGradient id="silver_metal" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFFFFF" />
                            <stop offset="35%" stopColor="#CBD5E1" />
                            <stop offset="70%" stopColor="#94A3B8" />
                            <stop offset="100%" stopColor="#475569" />
                        </linearGradient>
                        <linearGradient id="silver_bright" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#FFFFFF" />
                            <stop offset="50%" stopColor="#E2E8F0" />
                            <stop offset="100%" stopColor="#94A3B8" />
                        </linearGradient>
                    </defs>

                    {/* Folded Hanging Ribbon Tails */}
                    <g id="ribbon_tails_v">
                        <path d="M60 120 L40 178 L65 163 L88 178 L78 120 Z" fill="url(#silver_metal)" />
                        <path d="M140 120 L112 178 L135 163 L160 178 L122 120 Z" fill="#475569" />
                    </g>

                    {/* 12-Scallop Rosette Frame */}
                    {renderScallopedRosette('silver_metal')}

                    {/* Concentric Metallic Ring & Dark Blue Center */}
                    <circle cx="100" cy="78" r="56" fill="url(#silver_metal)" stroke="#FFFFFF" strokeWidth="1.5" />
                    <circle cx="100" cy="78" r="50" fill="#0A1128" stroke="#64748B" strokeWidth="2" />

                    {/* Laurels */}
                    {renderLaurels('silver_bright')}

                    {/* Top Accent: 3 Stars Arched */}
                    {renderStar(82, 40, 4.5, 'silver_bright')}
                    {renderStar(100, 36, 5.5, 'silver_bright')}
                    {renderStar(118, 40, 4.5, 'silver_bright')}

                    {/* Center Serif 'T' Emblem */}
                    <text x="100" y="100" fontSize="56" fontWeight="900" fontFamily="Georgia, 'Times New Roman', Times, serif" fill="url(#silver_bright)" textAnchor="middle" style={{ filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.8))' }}>
                        T
                    </text>

                    {/* Level Banner Pill */}
                    <rect x="52" y="136" width="96" height="24" rx="6" fill="#0A1128" stroke="#1E293B" strokeWidth="1.5" />
                    <text x="100" y="152" fontSize="12" fontWeight="900" fontFamily="Inter, sans-serif" fill="#FFFFFF" textAnchor="middle" letterSpacing="1.5">
                        LEVEL 3
                    </text>
                </svg>
            );

        case 4:
            // LEVEL 4: ELITE CREATOR - Gold Rosette, Bottom Shield, Serif 'T', Wide Outward Flaring Gold Ribbons
            return (
                <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} ${opacityClass}`}>
                    <defs>
                        <linearGradient id="gold_metal" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FEF08A" />
                            <stop offset="35%" stopColor="#FACC15" />
                            <stop offset="70%" stopColor="#CA8A04" />
                            <stop offset="100%" stopColor="#854D0E" />
                        </linearGradient>
                        <linearGradient id="gold_bright" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#FFFBEB" />
                            <stop offset="50%" stopColor="#FDE047" />
                            <stop offset="100%" stopColor="#CA8A04" />
                        </linearGradient>
                    </defs>

                    {/* Wide Outward Flaring Gold Ribbons */}
                    <g id="flaring_gold_ribbons">
                        {/* Left Ribbon */}
                        <path d="M62 110 L12 145 L22 170 L72 135 Z" fill="url(#gold_metal)" />
                        <path d="M62 110 L12 145 L22 170 L72 135 Z" stroke="#FEF08A" strokeWidth="1" fill="none" />
                        
                        {/* Right Ribbon */}
                        <path d="M138 110 L188 145 L178 170 L128 135 Z" fill="#854D0E" />
                        <path d="M138 110 L188 145 L178 170 L128 135 Z" stroke="#FEF08A" strokeWidth="1" fill="none" />
                    </g>

                    {/* 12-Scallop Rosette Frame */}
                    {renderScallopedRosette('gold_metal')}

                    {/* Concentric Metallic Ring & Dark Blue Center */}
                    <circle cx="100" cy="78" r="56" fill="url(#gold_metal)" stroke="#FEF08A" strokeWidth="1.5" />
                    <circle cx="100" cy="78" r="50" fill="#0A1128" stroke="#CA8A04" strokeWidth="2" />

                    {/* Laurels */}
                    {renderLaurels('gold_bright')}

                    {/* Bottom Accent: Shield with Star */}
                    <g transform="translate(100, 114) scale(0.9)">
                        <path d="M0 -8 L8 -4 L8 4 Q0 10 0 10 Q0 10 -8 4 L-8 -4 Z" fill="url(#gold_bright)" stroke="#FFF" strokeWidth="0.8" />
                        {renderStar(0, 0, 3.5, 'gold_bright')}
                    </g>

                    {/* Center Serif 'T' Emblem */}
                    <text x="100" y="98" fontSize="56" fontWeight="900" fontFamily="Georgia, 'Times New Roman', Times, serif" fill="url(#gold_bright)" textAnchor="middle" style={{ filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.8))' }}>
                        T
                    </text>

                    {/* Level Banner Pill */}
                    <rect x="52" y="136" width="96" height="24" rx="6" fill="#0A1128" stroke="#1E293B" strokeWidth="1.5" />
                    <text x="100" y="152" fontSize="12" fontWeight="900" fontFamily="Inter, sans-serif" fill="#FFFFFF" textAnchor="middle" letterSpacing="1.5">
                        LEVEL 4
                    </text>
                </svg>
            );

        case 5:
            // LEVEL 5: MASTER CREATOR - Gold Rosette + Blue Ring, 5 Stars Top, Bottom Shield, Serif 'TZ', Wide Outward Flaring Blue Ribbons with Gold Trim
            return (
                <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} ${opacityClass}`}>
                    <defs>
                        <linearGradient id="gold_metal" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FEF08A" />
                            <stop offset="35%" stopColor="#FACC15" />
                            <stop offset="70%" stopColor="#CA8A04" />
                            <stop offset="100%" stopColor="#854D0E" />
                        </linearGradient>
                        <linearGradient id="gold_bright" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#FFFBEB" />
                            <stop offset="50%" stopColor="#FDE047" />
                            <stop offset="100%" stopColor="#CA8A04" />
                        </linearGradient>
                        <linearGradient id="blue_ribbon" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#2563EB" />
                            <stop offset="50%" stopColor="#1E40AF" />
                            <stop offset="100%" stopColor="#1E3A8A" />
                        </linearGradient>
                    </defs>

                    {/* Wide Outward Flaring Blue Ribbons with Double Gold Trim */}
                    <g id="flaring_blue_ribbons">
                        {/* Left Ribbon */}
                        <path d="M62 110 L12 145 L22 170 L72 135 Z" fill="url(#blue_ribbon)" stroke="#FACC15" strokeWidth="2" />
                        <path d="M58 116 L18 147 L24 162 L65 136 Z" stroke="#FEF08A" strokeWidth="1" fill="none" />
                        
                        {/* Right Ribbon */}
                        <path d="M138 110 L188 145 L178 170 L128 135 Z" fill="#1E3A8A" stroke="#FACC15" strokeWidth="2" />
                        <path d="M142 116 L182 147 L176 162 L135 136 Z" stroke="#FEF08A" strokeWidth="1" fill="none" />
                    </g>

                    {/* 12-Scallop Rosette Frame */}
                    {renderScallopedRosette('gold_metal')}

                    {/* Concentric Metallic Ring & Royal Blue Ring & Dark Blue Center */}
                    <circle cx="100" cy="78" r="58" fill="url(#blue_ribbon)" stroke="#FEF08A" strokeWidth="2" />
                    <circle cx="100" cy="78" r="50" fill="#0A1128" stroke="#CA8A04" strokeWidth="2" />

                    {/* Laurels */}
                    {renderLaurels('gold_bright')}

                    {/* Top Accent: 5 Stars Arched */}
                    {renderStar(70, 48, 3.5, 'gold_bright')}
                    {renderStar(84, 38, 4.2, 'gold_bright')}
                    {renderStar(100, 34, 5.0, 'gold_bright')}
                    {renderStar(116, 38, 4.2, 'gold_bright')}
                    {renderStar(130, 48, 3.5, 'gold_bright')}

                    {/* Bottom Accent: Shield with Star */}
                    <g transform="translate(100, 115) scale(0.85)">
                        <path d="M0 -8 L8 -4 L8 4 Q0 10 0 10 Q0 10 -8 4 L-8 -4 Z" fill="url(#gold_bright)" stroke="#FFF" strokeWidth="0.8" />
                        {renderStar(0, 0, 3.5, 'gold_bright')}
                    </g>

                    {/* Center Serif 'TZ' Emblem */}
                    <text x="100" y="96" fontSize="44" fontWeight="900" fontFamily="Georgia, 'Times New Roman', Times, serif" fill="url(#gold_bright)" textAnchor="middle" letterSpacing="-2" style={{ filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.8))' }}>
                        TZ
                    </text>

                    {/* Level Banner Pill */}
                    <rect x="52" y="136" width="96" height="24" rx="6" fill="#0A1128" stroke="#1E293B" strokeWidth="1.5" />
                    <text x="100" y="152" fontSize="12" fontWeight="900" fontFamily="Inter, sans-serif" fill="#FFFFFF" textAnchor="middle" letterSpacing="1.5">
                        LEVEL 5
                    </text>
                </svg>
            );

        case 6:
            // LEVEL 6: LEGEND CREATOR - Gold Rosette + Black Ring, Golden Crown Top, 3 Stars Bottom, Serif 'TZ', Wide Outward Flaring Black Ribbons with Gold Trim
            return (
                <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} ${opacityClass}`}>
                    <defs>
                        <linearGradient id="gold_metal" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FEF08A" />
                            <stop offset="35%" stopColor="#FACC15" />
                            <stop offset="70%" stopColor="#CA8A04" />
                            <stop offset="100%" stopColor="#854D0E" />
                        </linearGradient>
                        <linearGradient id="gold_bright" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#FFFBEB" />
                            <stop offset="50%" stopColor="#FDE047" />
                            <stop offset="100%" stopColor="#CA8A04" />
                        </linearGradient>
                        <linearGradient id="black_ribbon" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#27272A" />
                            <stop offset="50%" stopColor="#18181B" />
                            <stop offset="100%" stopColor="#09090B" />
                        </linearGradient>
                    </defs>

                    {/* Wide Outward Flaring Black Ribbons with Double Gold Trim */}
                    <g id="flaring_black_ribbons">
                        {/* Left Ribbon */}
                        <path d="M62 110 L12 145 L22 170 L72 135 Z" fill="url(#black_ribbon)" stroke="#FACC15" strokeWidth="2" />
                        <path d="M58 116 L18 147 L24 162 L65 136 Z" stroke="#FEF08A" strokeWidth="1" fill="none" />
                        
                        {/* Right Ribbon */}
                        <path d="M138 110 L188 145 L178 170 L128 135 Z" fill="#09090B" stroke="#FACC15" strokeWidth="2" />
                        <path d="M142 116 L182 147 L176 162 L135 136 Z" stroke="#FEF08A" strokeWidth="1" fill="none" />
                    </g>

                    {/* 12-Scallop Rosette Frame */}
                    {renderScallopedRosette('gold_metal')}

                    {/* Concentric Metallic Ring & Dark Outer Circle & Dark Blue Center */}
                    <circle cx="100" cy="78" r="58" fill="url(#black_ribbon)" stroke="#FEF08A" strokeWidth="2" />
                    <circle cx="100" cy="78" r="50" fill="#0A1128" stroke="#CA8A04" strokeWidth="2" />

                    {/* Laurels */}
                    {renderLaurels('gold_bright')}

                    {/* Top Accent: Detailed Golden Crown */}
                    <g transform="translate(100, 36) scale(0.9)">
                        <path d="M-18 10 L-14 -4 L-5 2 L0 -12 L5 2 L14 -4 L18 10 Z" fill="url(#gold_bright)" stroke="#FFF" strokeWidth="0.8" />
                        <circle cx="-14" cy="-4" r="1.5" fill="#FFF" />
                        <circle cx="0" cy="-12" r="2.0" fill="#FFF" />
                        <circle cx="14" cy="-4" r="1.5" fill="#FFF" />
                    </g>

                    {/* Bottom Accent: 3 Stars Arched */}
                    {renderStar(86, 116, 4.0, 'gold_bright')}
                    {renderStar(100, 118, 4.8, 'gold_bright')}
                    {renderStar(114, 116, 4.0, 'gold_bright')}

                    {/* Center Serif 'TZ' Emblem */}
                    <text x="100" y="96" fontSize="44" fontWeight="900" fontFamily="Georgia, 'Times New Roman', Times, serif" fill="url(#gold_bright)" textAnchor="middle" letterSpacing="-2" style={{ filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.8))' }}>
                        TZ
                    </text>

                    {/* Level Banner Pill */}
                    <rect x="52" y="136" width="96" height="24" rx="6" fill="#0A1128" stroke="#1E293B" strokeWidth="1.5" />
                    <text x="100" y="152" fontSize="12" fontWeight="900" fontFamily="Inter, sans-serif" fill="#FFFFFF" textAnchor="middle" letterSpacing="1.5">
                        LEVEL 6
                    </text>
                </svg>
            );

        default:
            return null;
    }
};
