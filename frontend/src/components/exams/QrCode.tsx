import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** A crisp SVG QR code for a join link (projected in class, printed on slips). */
export default function QrCode({ value, size = 160, className = '', dark = '#0f172a', light = '#ffffff', level = 'M', margin = 1 }: {
    value: string;
    size?: number;
    className?: string;
    dark?: string;
    light?: string;
    /** Error correction. 'Q' or 'H' when a logo covers the middle of the code. */
    level?: 'L' | 'M' | 'Q' | 'H';
    /** White border, in modules. Use 2+ when the box has rounded corners. */
    margin?: number;
}) {
    const [svg, setSvg] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        QRCode.toString(value, { type: 'svg', margin, errorCorrectionLevel: level, color: { dark, light } })
            .then(markup => { if (!cancelled) setSvg(markup); })
            .catch(() => { if (!cancelled) setSvg(null); });
        return () => { cancelled = true; };
    }, [value, dark, light, level, margin]);

    if (!svg) return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} style={{ width: size, height: size }} />;
    return (
        <div
            role="img"
            aria-label={`QR code for ${value}`}
            className={`overflow-hidden rounded-xl [&>svg]:h-full [&>svg]:w-full ${className}`}
            style={{ width: size, height: size }}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}
