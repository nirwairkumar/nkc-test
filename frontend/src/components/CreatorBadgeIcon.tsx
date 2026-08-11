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
    size = 140,
    locked = false
}) => {
    const opacityClass = locked ? "grayscale opacity-50 contrast-75" : "";

    switch (level) {
        case 1:
            // LEVEL 1: VERIFIED CREATOR - Bronze/Amber Circle with T
            return (
                <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} ${opacityClass}`}>
                    <defs>
                        <linearGradient id="l1_ring" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#D97706" />
                            <stop offset="50%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#78350F" />
                        </linearGradient>
                        <linearGradient id="l1_inner" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#27272A" />
                            <stop offset="100%" stopColor="#09090B" />
                        </linearGradient>
                        <linearGradient id="l1_gold_text" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#FDE68A" />
                            <stop offset="100%" stopColor="#D97706" />
                        </linearGradient>
                    </defs>

                    {/* Ribbon Backing */}
                    <path d="M60 140 L45 185 L70 170 L95 185 L85 140 Z" fill="#B45309" />
                    <path d="M140 140 L115 185 L130 170 L155 185 L140 140 Z" fill="#92400E" />

                    {/* Outer Gold/Bronze Medal Circle */}
                    <circle cx="100" cy="90" r="65" fill="url(#l1_ring)" stroke="#FEF3C7" strokeWidth="3" />
                    <circle cx="100" cy="90" r="56" fill="url(#l1_inner)" stroke="#D97706" strokeWidth="2.5" />

                    {/* Laurels left/right */}
                    <path d="M60 90 Q50 70 65 55" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <path d="M140 90 Q150 70 135 55" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" fill="none" />

                    {/* Top Shield Icon */}
                    <path d="M100 44 L108 50 L108 60 Q100 66 100 66 Q100 66 92 60 L92 50 Z" fill="#F59E0B" stroke="#FFF" strokeWidth="1" />

                    {/* Central 'T' Logo */}
                    <text x="100" y="112" fontSize="56" fontWeight="900" fontFamily="Inter, sans-serif" fill="url(#l1_gold_text)" textAnchor="middle">
                        T
                    </text>

                    {/* Level Banner */}
                    <rect x="55" y="140" width="90" height="22" rx="4" fill="#09090B" stroke="#F59E0B" strokeWidth="1.5" />
                    <text x="100" y="155" fontSize="11" fontWeight="800" fontFamily="Inter, sans-serif" fill="#FFFFFF" textAnchor="middle" letterSpacing="1">
                        LEVEL 1
                    </text>
                </svg>
            );

        case 2:
            // LEVEL 2: TRUSTED CREATOR - Copper/Bronze with 2 Stars Top
            return (
                <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} ${opacityClass}`}>
                    <defs>
                        <linearGradient id="l2_ring" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#EA580C" />
                            <stop offset="50%" stopColor="#C2410C" />
                            <stop offset="100%" stopColor="#7C2D12" />
                        </linearGradient>
                        <linearGradient id="l2_inner" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#3F3F46" />
                            <stop offset="100%" stopColor="#18181B" />
                        </linearGradient>
                        <linearGradient id="l2_copper_text" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#FFEDD5" />
                            <stop offset="100%" stopColor="#F97316" />
                        </linearGradient>
                    </defs>

                    {/* Ribbon Backing */}
                    <path d="M55 138 L35 185 L65 170 L85 185 L78 138 Z" fill="#9A3412" />
                    <path d="M145 138 L122 185 L142 170 L165 185 L145 138 Z" fill="#7C2D12" />

                    {/* Outer Medal Circle */}
                    <circle cx="100" cy="88" r="65" fill="url(#l2_ring)" stroke="#FFEDD5" strokeWidth="3" />
                    <circle cx="100" cy="88" r="56" fill="url(#l2_inner)" stroke="#FB923C" strokeWidth="2.5" />

                    {/* 2 Stars Top */}
                    <path d="M85 45 L87 50 L92 50 L88 53 L89 58 L85 55 L81 58 L82 53 L78 50 L83 50 Z" fill="#F97316" />
                    <path d="M115 45 L117 50 L122 50 L118 53 L119 58 L115 55 L111 58 L112 53 L108 50 L113 50 Z" fill="#F97316" />

                    {/* Laurels left/right */}
                    <path d="M58 88 Q48 68 64 53" stroke="#F97316" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <path d="M142 88 Q152 68 136 53" stroke="#F97316" strokeWidth="3" strokeLinecap="round" fill="none" />

                    {/* Central 'T' Logo */}
                    <text x="100" y="112" fontSize="56" fontWeight="900" fontFamily="Inter, sans-serif" fill="url(#l2_copper_text)" textAnchor="middle">
                        T
                    </text>

                    {/* Level Banner */}
                    <rect x="55" y="140" width="90" height="22" rx="4" fill="#09090B" stroke="#F97316" strokeWidth="1.5" />
                    <text x="100" y="155" fontSize="11" fontWeight="800" fontFamily="Inter, sans-serif" fill="#FFFFFF" textAnchor="middle" letterSpacing="1">
                        LEVEL 2
                    </text>
                </svg>
            );

        case 3:
            // LEVEL 3: EXPERT CREATOR - Silver/Platinum with 3 Stars Top
            return (
                <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} ${opacityClass}`}>
                    <defs>
                        <linearGradient id="l3_ring" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#E2E8F0" />
                            <stop offset="50%" stopColor="#94A3B8" />
                            <stop offset="100%" stopColor="#475569" />
                        </linearGradient>
                        <linearGradient id="l3_inner" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#1E293B" />
                            <stop offset="100%" stopColor="#0F172A" />
                        </linearGradient>
                        <linearGradient id="l3_silver_text" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#FFFFFF" />
                            <stop offset="100%" stopColor="#CBD5E1" />
                        </linearGradient>
                    </defs>

                    {/* Ribbon Backing */}
                    <path d="M55 138 L35 185 L65 170 L85 185 L78 138 Z" fill="#475569" />
                    <path d="M145 138 L122 185 L142 170 L165 185 L145 138 Z" fill="#334155" />

                    {/* Outer Medal Circle */}
                    <circle cx="100" cy="88" r="65" fill="url(#l3_ring)" stroke="#F8FAFC" strokeWidth="3" />
                    <circle cx="100" cy="88" r="56" fill="url(#l3_inner)" stroke="#CBD5E1" strokeWidth="2.5" />

                    {/* 3 Stars Top */}
                    <path d="M75 48 L77 53 L82 53 L78 56 L79 61 L75 58 L71 61 L72 56 L68 53 L73 53 Z" fill="#E2E8F0" />
                    <path d="M100 42 L102 47 L107 47 L103 50 L104 55 L100 52 L96 55 L97 50 L93 47 L98 47 Z" fill="#FFFFFF" />
                    <path d="M125 48 L127 53 L132 53 L128 56 L129 61 L125 58 L121 61 L122 56 L118 53 L123 53 Z" fill="#E2E8F0" />

                    {/* Laurels left/right */}
                    <path d="M58 88 Q48 68 64 53" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <path d="M142 88 Q152 68 136 53" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" fill="none" />

                    {/* Central 'T' Logo */}
                    <text x="100" y="112" fontSize="56" fontWeight="900" fontFamily="Inter, sans-serif" fill="url(#l3_silver_text)" textAnchor="middle">
                        T
                    </text>

                    {/* Level Banner */}
                    <rect x="55" y="140" width="90" height="22" rx="4" fill="#0F172A" stroke="#E2E8F0" strokeWidth="1.5" />
                    <text x="100" y="155" fontSize="11" fontWeight="800" fontFamily="Inter, sans-serif" fill="#FFFFFF" textAnchor="middle" letterSpacing="1">
                        LEVEL 3
                    </text>
                </svg>
            );

        case 4:
            // LEVEL 4: ELITE CREATOR - Radiant Gold with Bottom Shield Accent
            return (
                <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} ${opacityClass}`}>
                    <defs>
                        <linearGradient id="l4_ring" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FDE047" />
                            <stop offset="50%" stopColor="#EAB308" />
                            <stop offset="100%" stopColor="#CA8A04" />
                        </linearGradient>
                        <linearGradient id="l4_inner" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#18181B" />
                            <stop offset="100%" stopColor="#09090B" />
                        </linearGradient>
                        <linearGradient id="l4_gold_text" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#FEF08A" />
                            <stop offset="100%" stopColor="#EAB308" />
                        </linearGradient>
                    </defs>

                    {/* Ribbon Backing */}
                    <path d="M50 135 L25 185 L60 170 L80 185 L72 135 Z" fill="#CA8A04" />
                    <path d="M150 135 L128 185 L148 170 L175 185 L150 135 Z" fill="#A16207" />

                    {/* Outer Gold Scalloped Star/Circle */}
                    <circle cx="100" cy="85" r="66" fill="url(#l4_ring)" stroke="#FEF08A" strokeWidth="3" />
                    <circle cx="100" cy="85" r="56" fill="url(#l4_inner)" stroke="#FACC15" strokeWidth="2.5" />

                    {/* Bottom Shield Accent on Inner Circle */}
                    <path d="M100 125 L106 130 L106 137 Q100 142 100 142 Q100 142 94 137 L94 130 Z" fill="#EAB308" stroke="#FFF" strokeWidth="1" />
                    <path d="M100 132 L102 135 L104 135 L102 137 L103 139 L100 138 L97 139 L98 137 L96 135 L98 135 Z" fill="#FFF" />

                    {/* Laurels left/right */}
                    <path d="M58 85 Q48 65 64 50" stroke="#FACC15" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                    <path d="M142 85 Q152 65 136 50" stroke="#FACC15" strokeWidth="3.5" strokeLinecap="round" fill="none" />

                    {/* Central 'T' Logo */}
                    <text x="100" y="108" fontSize="56" fontWeight="900" fontFamily="Inter, sans-serif" fill="url(#l4_gold_text)" textAnchor="middle">
                        T
                    </text>

                    {/* Level Banner */}
                    <rect x="55" y="142" width="90" height="22" rx="4" fill="#09090B" stroke="#EAB308" strokeWidth="1.5" />
                    <text x="100" y="157" fontSize="11" fontWeight="800" fontFamily="Inter, sans-serif" fill="#FFFFFF" textAnchor="middle" letterSpacing="1">
                        LEVEL 4
                    </text>
                </svg>
            );

        case 5:
            // LEVEL 5: MASTER CREATOR - Royal Blue & Gold with 5 Stars Arc and 'TZ'
            return (
                <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} ${opacityClass}`}>
                    <defs>
                        <linearGradient id="l5_ring" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FACC15" />
                            <stop offset="50%" stopColor="#1E40AF" />
                            <stop offset="100%" stopColor="#1E3A8A" />
                        </linearGradient>
                        <linearGradient id="l5_inner" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#172554" />
                            <stop offset="100%" stopColor="#0B132B" />
                        </linearGradient>
                        <linearGradient id="l5_gold_text" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#FEF08A" />
                            <stop offset="100%" stopColor="#EAB308" />
                        </linearGradient>
                    </defs>

                    {/* Side Blue Ribbons */}
                    <path d="M48 135 L18 185 L52 170 L72 185 L65 135 Z" fill="#1E40AF" />
                    <path d="M152 135 L130 185 L148 170 L182 185 L152 135 Z" fill="#1E3A8A" />

                    {/* Outer Gold Scalloped Star/Circle */}
                    <circle cx="100" cy="85" r="67" fill="url(#l5_ring)" stroke="#FEF08A" strokeWidth="3" />
                    <circle cx="100" cy="85" r="56" fill="url(#l5_inner)" stroke="#FACC15" strokeWidth="2.5" />

                    {/* 5 Stars Arc Top */}
                    <path d="M60 62 L62 66 L66 66 L63 68 L64 72 L60 70 L56 72 L57 68 L54 66 L58 66 Z" fill="#FACC15" />
                    <path d="M78 48 L80 52 L84 52 L81 54 L82 58 L78 56 L74 58 L75 54 L72 52 L76 52 Z" fill="#FACC15" />
                    <path d="M100 42 L102 46 L106 46 L103 48 L104 52 L100 50 L96 52 L97 48 L94 46 L98 46 Z" fill="#FFFFFF" />
                    <path d="M122 48 L124 52 L128 52 L125 54 L126 58 L122 56 L118 58 L119 54 L116 52 L120 52 Z" fill="#FACC15" />
                    <path d="M140 62 L142 66 L146 66 L143 68 L144 72 L140 70 L136 72 L137 68 L134 66 L138 66 Z" fill="#FACC15" />

                    {/* Central 'TZ' Logo */}
                    <text x="100" y="108" fontSize="48" fontWeight="900" fontFamily="Inter, sans-serif" fill="url(#l5_gold_text)" textAnchor="middle" letterSpacing="-2">
                        TZ
                    </text>

                    {/* Bottom Shield */}
                    <path d="M100 124 L106 128 L106 134 Q100 138 100 138 Q100 138 94 134 L94 128 Z" fill="#FACC15" stroke="#FFF" strokeWidth="1" />

                    {/* Level Banner */}
                    <rect x="55" y="142" width="90" height="22" rx="4" fill="#1E3A8A" stroke="#FACC15" strokeWidth="1.5" />
                    <text x="100" y="157" fontSize="11" fontWeight="800" fontFamily="Inter, sans-serif" fill="#FFFFFF" textAnchor="middle" letterSpacing="1">
                        LEVEL 5
                    </text>
                </svg>
            );

        case 6:
            // LEVEL 6: LEGEND CREATOR - Crowned Imperial Gold & Onyx Black with 'TZ'
            return (
                <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} ${opacityClass}`}>
                    <defs>
                        <linearGradient id="l6_ring" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FACC15" />
                            <stop offset="50%" stopColor="#EAB308" />
                            <stop offset="100%" stopColor="#09090B" />
                        </linearGradient>
                        <linearGradient id="l6_inner" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#18181B" />
                            <stop offset="100%" stopColor="#000000" />
                        </linearGradient>
                        <linearGradient id="l6_crown_gold" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FEF08A" />
                            <stop offset="50%" stopColor="#FACC15" />
                            <stop offset="100%" stopColor="#CA8A04" />
                        </linearGradient>
                    </defs>

                    {/* Dark Gold / Black Ribbons */}
                    <path d="M48 135 L18 185 L52 170 L72 185 L65 135 Z" fill="#27272A" stroke="#EAB308" strokeWidth="1" />
                    <path d="M152 135 L130 185 L148 170 L182 185 L152 135 Z" fill="#18181B" stroke="#EAB308" strokeWidth="1" />

                    {/* Outer Gold & Black Medal Circle */}
                    <circle cx="100" cy="85" r="67" fill="url(#l6_ring)" stroke="#FEF08A" strokeWidth="3" />
                    <circle cx="100" cy="85" r="56" fill="url(#l6_inner)" stroke="#FACC15" strokeWidth="2.5" />

                    {/* Golden Crown Top */}
                    <path d="M80 54 L85 40 L93 48 L100 34 L107 48 L115 40 L120 54 Z" fill="url(#l6_crown_gold)" stroke="#FFF" strokeWidth="1" />
                    <circle cx="85" cy="39" r="2" fill="#FFF" />
                    <circle cx="100" cy="33" r="2.5" fill="#FFF" />
                    <circle cx="115" cy="39" r="2" fill="#FFF" />

                    {/* Central 'TZ' Logo */}
                    <text x="100" y="104" fontSize="48" fontWeight="900" fontFamily="Inter, sans-serif" fill="url(#l6_crown_gold)" textAnchor="middle" letterSpacing="-2">
                        TZ
                    </text>

                    {/* 3 Stars Bottom */}
                    <path d="M82 118 L84 122 L88 122 L85 124 L86 128 L82 126 L78 128 L79 124 L76 122 L80 122 Z" fill="#FACC15" />
                    <path d="M100 120 L102 124 L106 124 L103 126 L104 130 L100 128 L96 130 L97 126 L94 124 L98 124 Z" fill="#FFFFFF" />
                    <path d="M118 118 L120 122 L124 122 L121 124 L122 128 L118 126 L114 128 L115 124 L112 122 L116 122 Z" fill="#FACC15" />

                    {/* Level Banner */}
                    <rect x="55" y="142" width="90" height="22" rx="4" fill="#09090B" stroke="#FACC15" strokeWidth="1.5" />
                    <text x="100" y="157" fontSize="11" fontWeight="800" fontFamily="Inter, sans-serif" fill="#FFFFFF" textAnchor="middle" letterSpacing="1">
                        LEVEL 6
                    </text>
                </svg>
            );

        default:
            return null;
    }
};
