import React from 'react';

interface TestoZaLogoProps {
    size?: number;
    showText?: boolean;
    className?: string;
    animate?: boolean;
}

/**
 * Animated TestoZa Logo
 * Uses the actual SVG logo with animation overlays for:
 * 1. Bubbles falling into the flask neck
 * 2. Processing ring rotation on the center bluish circle
 */
export default function TestoZaLogo({ size = 40, showText = true, className = '', animate = true }: TestoZaLogoProps) {
    // The original SVG viewBox is 273x310
    const aspectRatio = 273 / 310;
    const iconWidth = size * aspectRatio;

    // Center of the bullseye in the original SVG coordinate system
    const cx = 111;
    const cy = 200;

    return (
        <div className={`flex items-center gap-2 select-none ${className}`}>
            {/* Logo container with overlay */}
            <div className="relative flex-shrink-0" style={{ width: iconWidth, height: size }}>
                {/* Base SVG logo (static) */}
                <img
                    src="/logo-testoza-icon.svg"
                    alt="TestoZa"
                    width={iconWidth}
                    height={size}
                    className="block"
                    draggable={false}
                />

                {/* Animation overlay SVG */}
                {animate && (
                    <svg
                        className="absolute inset-0 pointer-events-none"
                        width={iconWidth}
                        height={size}
                        viewBox="0 0 273 310"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            {/* Gradient for the spinning ring */}
                            <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#25C6DA" stopOpacity="1" />
                                <stop offset="40%" stopColor="#3B82F6" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#5B3383" stopOpacity="0.1" />
                            </linearGradient>

                            {/* Clip: bubbles only visible inside the flask neck area */}
                            <clipPath id="neckClipPath">
                                <rect x="92" y="-10" width="52" height="160" />
                            </clipPath>
                        </defs>

                        {/* === PROCESSING RING ON CENTER CIRCLE === */}
                        {/* This rotating dashed ring overlays on the bluish middle circle */}
                        <circle
                            cx={cx}
                            cy={cy}
                            r={15}
                            fill="none"
                            stroke="url(#spinGrad)"
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            strokeDasharray="18 76"
                            opacity="0.85"
                        >
                            <animateTransform
                                attributeName="transform"
                                type="rotate"
                                from={`0 ${cx} ${cy}`}
                                to={`360 ${cx} ${cy}`}
                                dur="2s"
                                repeatCount="indefinite"
                            />
                        </circle>

                        {/* === BUBBLES FALLING INTO FLASK === */}
                        <g clipPath="url(#neckClipPath)">
                            {/* Bubble 1 - Large cyan */}
                            <circle r="4.5" fill="#25C6DA">
                                <animateMotion
                                    path="M115,-8 L115,148"
                                    dur="2.5s"
                                    begin="0s"
                                    repeatCount="indefinite"
                                />
                                <animate
                                    attributeName="opacity"
                                    values="0;0.9;0.85;0"
                                    keyTimes="0;0.08;0.7;1"
                                    dur="2.5s"
                                    begin="0s"
                                    repeatCount="indefinite"
                                />
                            </circle>

                            {/* Bubble 2 - Medium blue */}
                            <circle r="3.5" fill="#3B82F6">
                                <animateMotion
                                    path="M110,-5 L110,146"
                                    dur="3s"
                                    begin="0.8s"
                                    repeatCount="indefinite"
                                />
                                <animate
                                    attributeName="opacity"
                                    values="0;0.85;0.8;0"
                                    keyTimes="0;0.08;0.7;1"
                                    dur="3s"
                                    begin="0.8s"
                                    repeatCount="indefinite"
                                />
                            </circle>

                            {/* Bubble 3 - Small purple */}
                            <circle r="2.5" fill="#8B5CF6">
                                <animateMotion
                                    path="M120,-6 L120,145"
                                    dur="2.2s"
                                    begin="1.4s"
                                    repeatCount="indefinite"
                                />
                                <animate
                                    attributeName="opacity"
                                    values="0;0.8;0.75;0"
                                    keyTimes="0;0.08;0.7;1"
                                    dur="2.2s"
                                    begin="1.4s"
                                    repeatCount="indefinite"
                                />
                            </circle>

                            {/* Bubble 4 - Tiny fast cyan */}
                            <circle r="2" fill="#22D3EE">
                                <animateMotion
                                    path="M113,-4 L113,142"
                                    dur="1.8s"
                                    begin="0.3s"
                                    repeatCount="indefinite"
                                />
                                <animate
                                    attributeName="opacity"
                                    values="0;0.7;0.65;0"
                                    keyTimes="0;0.08;0.7;1"
                                    dur="1.8s"
                                    begin="0.3s"
                                    repeatCount="indefinite"
                                />
                            </circle>

                            {/* Bubble 5 - Medium teal, offset */}
                            <circle r="3" fill="#06B6D4">
                                <animateMotion
                                    path="M108,-7 L108,147"
                                    dur="2.8s"
                                    begin="1.9s"
                                    repeatCount="indefinite"
                                />
                                <animate
                                    attributeName="opacity"
                                    values="0;0.85;0.8;0"
                                    keyTimes="0;0.08;0.7;1"
                                    dur="2.8s"
                                    begin="1.9s"
                                    repeatCount="indefinite"
                                />
                            </circle>
                        </g>
                    </svg>
                )}
            </div>

            {/* "TestoZa" Text */}
            {showText && (
                <span
                    style={{
                        fontFamily: "'Ribeye', serif",
                        fontSize: `${size * 0.5}px`,
                        fontWeight: 'bold',
                        lineHeight: 1,
                        background: 'linear-gradient(to right, #2563eb, #4f46e5)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        letterSpacing: '1.5px',
                    }}
                >
                    TestoZa
                </span>
            )}
        </div>
    );
}
