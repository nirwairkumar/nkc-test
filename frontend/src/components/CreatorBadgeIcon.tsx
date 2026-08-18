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

    switch (level) {
        case 1:
            // LEVEL 1: VERIFIED CREATOR - Exact 1st Award Badge Asset
            return (
                <img
                    src="/reward-icons/testoza_verified_creator_badge_exact(1st).svg"
                    width={size}
                    height={size}
                    alt="Level 1 Verified Creator Badge"
                    className={`${className} ${opacityClass}`}
                />
            );

        case 2:
            // LEVEL 2: TRUSTED CREATOR - Exact 2nd Award Badge Asset
            return (
                <img
                    src="/reward-icons/testoza_trusted_creator_badge_exact(2nd).svg"
                    width={size}
                    height={size}
                    alt="Level 2 Trusted Creator Badge"
                    className={`${className} ${opacityClass}`}
                />
            );

        case 3:
            // LEVEL 3: EXPERT CREATOR - Exact 3rd Award Badge Asset
            return (
                <img
                    src="/reward-icons/testoza_expert_creator_badge_exact(3rd).svg"
                    width={size}
                    height={size}
                    alt="Level 3 Expert Creator Badge"
                    className={`${className} ${opacityClass}`}
                />
            );

        case 4:
            // LEVEL 4: ELITE CREATOR - Exact 4th Award Badge Asset
            return (
                <img
                    src="/reward-icons/testoza_elite_creator_badge_exact(4th).svg"
                    width={size}
                    height={size}
                    alt="Level 4 Elite Creator Badge"
                    className={`${className} ${opacityClass}`}
                />
            );

        case 5:
            // LEVEL 5: MASTER CREATOR - Exact 5th Award Badge Asset
            return (
                <img
                    src="/reward-icons/testoza_badge_transparent(5th).svg"
                    width={size}
                    height={size}
                    alt="Level 5 Master Creator Badge"
                    className={`${className} ${opacityClass}`}
                />
            );

        case 6:
            // LEVEL 6: LEGEND CREATOR - Exact 6th Award Badge Asset
            return (
                <img
                    src="/reward-icons/testoza_badge_exact(6th).svg"
                    width={size}
                    height={size}
                    alt="Level 6 Legend Creator Badge"
                    className={`${className} ${opacityClass}`}
                />
            );

        default:
            return null;
    }
};
