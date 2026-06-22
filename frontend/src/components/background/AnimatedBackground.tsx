import React from 'react';

export default function AnimatedBackground() {
    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-slate-900">
            {/* Background Gradient */}
            <div
                className="absolute inset-0 w-full h-full"
                style={{ background: 'linear-gradient(to top, #0f172a, #312e81)' }}
            />

            {/* Vignette Overlay */}
            <div className="absolute inset-0 bg-radial-gradient(circle at center, transparent 0%, #020617 100%) pointer-events-none opacity-50" />
        </div>
    );
}
