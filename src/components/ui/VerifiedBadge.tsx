import React from 'react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
    size?: number;
    className?: string;
}

export default function VerifiedBadge({ size = 16, className }: VerifiedBadgeProps) {
    return (
        <img
            src="/verified-badge.svg"
            onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null; // Prevent loop
                target.src = "/verified-badge.png";
            }}
            alt="Verified by Testoza"
            title="Verified by Testoza"
            className={cn("inline-block select-none pointer-events-none", className)}
            style={{
                width: size,
                height: size,
                minWidth: size,
                minHeight: size,
                objectFit: 'contain'
            }}
        />
    );
}
