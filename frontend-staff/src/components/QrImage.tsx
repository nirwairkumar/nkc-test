/**
 * The 2-step QR code, drawn in the browser. The otpauth link contains the secret, so it
 * must never be sent to an online QR service. Rendered as an <img> data URL (no innerHTML).
 */
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Skeleton } from './ui';

export default function QrImage({ value, size = 208 }: { value: string; size?: number }) {
    const [src, setSrc] = useState<string | null>(null);
    useEffect(() => {
        let alive = true;
        QRCode.toString(value, { type: 'svg', errorCorrectionLevel: 'M', margin: 2 })
            .then((svg) => {
                if (alive) setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
            })
            .catch(() => setSrc(null));
        return () => {
            alive = false;
        };
    }, [value]);

    if (!src) return <Skeleton className="h-52 w-52 rounded-2xl" />;
    return (
        <img
            src={src}
            width={size}
            height={size}
            alt="QR code for your authenticator app"
            className="rounded-2xl bg-white p-2 ring-1 ring-slate-900/[0.08]"
            draggable={false}
        />
    );
}
