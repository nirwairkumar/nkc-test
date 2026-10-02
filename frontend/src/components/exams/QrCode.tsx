import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** A crisp SVG QR code for a join link (projected in class, printed on slips). */
export default function QrCode({ value, size = 160, className = '', dark = '#0f172a', light = '#ffffff' }: {
    value: string;
    size?: number;
    className?: string;
    dark?: string;
    light?: string;
}) {
    const [svg, setSvg] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark, light } })
            .then(markup => { if (!cancelled) setSvg(markup); })
            .catch(() => { if (!cancelled) setSvg(null); });
        return () => { cancelled = true; };
    }, [value, dark, light]);

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
