import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X } from 'lucide-react';
import QrCode from '@/components/exams/QrCode';
import { SHARE_APPS, type ShareApp, type ShareAppId, shareAppById, shareQrUrl } from './shareApps';

/**
 * "Scan to share" beside a live exam: the examiner points their phone at it and the
 * invitation opens in the app they picked below the code (or the phone's share sheet).
 * The ⤢ button shows the same code full screen, for an easier scan.
 * Desktop only; on a phone the Share button already does this.
 */
export default function ShareQrPanel({ test, className = '' }: { test: any; className?: string }) {
    const [appId, setAppId] = useState<ShareAppId>('any');
    const [fullScreen, setFullScreen] = useState(false);
    const app = shareAppById(appId);
    const url = shareQrUrl(test, appId);

    return (
        <div
            className={`relative w-[168px] rounded-2xl bg-gradient-to-b from-white to-slate-50/80 px-3 pb-2.5 pt-2 ring-1 ring-slate-900/[0.07] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_30px_-20px_rgba(15,23,42,0.45)] ${className}`}
        >
            <button
                type="button"
                onClick={() => setFullScreen(true)}
                aria-label="Show this QR full screen"
                title="Full screen"
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 cursor-pointer"
            >
                <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <p className="text-center text-[12.5px] font-semibold tracking-[-0.01em] text-slate-900">Scan to share</p>
            <p className="mt-0.5 truncate text-center text-[11px] text-slate-500" title={app.hint}>{app.hint}</p>

            <BrandedQr url={url} app={app} size={112} className="mx-auto mt-1.5" />
            <AppChips appId={appId} onPick={setAppId} className="mt-2" />

            {fullScreen && (
                <FullScreenQr
                    title={test.title}
                    appId={appId}
                    url={url}
                    onPick={setAppId}
                    onClose={() => setFullScreen(false)}
                />
            )}
        </div>
    );
}

/**
 * The QR with the picked app's icon in the middle (TestoZa's for "any app"). Level Q keeps it scannable.
 * Also used by the invite link's QR (components/referrals/ReferralQrPanel).
 */
export function BrandedQr({ url, app, size, className = '' }: { url: string; app: ShareApp; size: number; className?: string }) {
    // The badge covers about a fifth of the width, which level Q absorbs (checked at 112 px).
    const badge = Math.round(size * 0.215);
    const glyph = Math.round(badge * 0.64);
    return (
        <div className={`relative ${className}`} style={{ width: size, height: size }}>
            <QrCode key={url} value={url} size={size} level="Q" margin={2} className="!rounded-lg bg-white ring-1 ring-slate-900/[0.06]" />
            <span
                className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-white shadow-[0_1px_4px_rgba(15,23,42,0.2)] ring-2 ring-white"
                style={{ width: badge, height: badge, borderRadius: Math.round(badge * 0.3), color: app.color }}
                aria-hidden="true"
            >
                {app.id === 'any'
                    ? <img src="/logo-testoza-icon.svg" alt="" style={{ width: glyph, height: glyph }} />
                    : <span className="flex [&>svg]:h-full [&>svg]:w-full" style={{ width: glyph, height: glyph }}><app.Icon /></span>}
            </span>
        </div>
    );
}

export function AppChips({ appId, onPick, large = false, className = '' }: {
    appId: ShareAppId; onPick: (id: ShareAppId) => void; large?: boolean; className?: string;
}) {
    return (
        <div role="radiogroup" aria-label="Share to" className={`flex items-center justify-center ${large ? 'gap-3' : 'gap-1'} ${className}`}>
            {SHARE_APPS.map(a => {
                const on = a.id === appId;
                return (
                    <button
                        key={a.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={a.label}
                        title={a.label}
                        onClick={() => onPick(a.id)}
                        className={`flex items-center justify-center rounded-full transition-[background-color,color,transform,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 cursor-pointer ${large ? 'h-12 w-12' : 'h-6 w-6'} ${on ? 'scale-110 text-white shadow-[0_4px_10px_-4px_rgba(15,23,42,0.5)]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'}`}
                        style={on ? { backgroundColor: a.color } : undefined}
                    >
                        <a.Icon className={large ? 'h-6 w-6' : 'h-3.5 w-3.5'} />
                    </button>
                );
            })}
        </div>
    );
}

/** The same share QR, as big as the screen allows. Esc, × or leaving full screen closes it. */
export function FullScreenQr({ title, appId, url, onPick, onClose }: {
    title: string; appId: ShareAppId; url: string; onPick: (id: ShareAppId) => void; onClose: () => void;
}) {
    const rootRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    const [side, setSide] = useState(qrSide);
    const app = shareAppById(appId);

    useEffect(() => {
        // Real full screen where the browser allows it; otherwise the overlay still covers the page.
        rootRef.current?.requestFullscreen?.().catch(() => { /* stays an overlay */ });
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
        const onFs = () => { if (!document.fullscreenElement) closeRef.current(); };
        const onResize = () => setSide(qrSide());
        window.addEventListener('keydown', onKey);
        document.addEventListener('fullscreenchange', onFs);
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('keydown', onKey);
            document.removeEventListener('fullscreenchange', onFs);
            window.removeEventListener('resize', onResize);
            if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
        };
    }, []);

    return createPortal(
        <div
            ref={rootRef}
            role="dialog"
            aria-modal="true"
            aria-label="Scan to share, full screen"
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-[2.4vh] bg-[radial-gradient(120%_70%_at_50%_0%,#e0f2fe_0%,#f8fafc_55%,#ffffff_100%)] px-6 text-center"
        >
            <button
                type="button"
                onClick={onClose}
                aria-label="Close full screen"
                className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-900/[0.08] transition-colors hover:text-slate-900 cursor-pointer"
            >
                <X className="h-5 w-5" />
            </button>

            <div>
                <p className="text-[clamp(22px,3.4vh,40px)] font-bold tracking-[-0.02em] text-slate-900">Scan to share</p>
                <p className="mx-auto mt-1 max-w-[80vw] truncate text-[clamp(14px,2vh,20px)] text-slate-600">{title}</p>
            </div>
            <div className="rounded-3xl bg-white p-[1.6vh] shadow-[0_30px_60px_-30px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/[0.06]">
                <BrandedQr url={url} app={app} size={side} />
            </div>
            <p className="text-[clamp(14px,2.1vh,22px)] font-medium text-slate-700">{app.hint}</p>
            <AppChips appId={appId} onPick={onPick} large />
        </div>,
        document.body,
    );
}

/** Big enough to scan from across a desk, leaving room for the text around it. */
function qrSide() {
    return Math.round(Math.max(200, Math.min(window.innerHeight * 0.52, window.innerWidth * 0.8)));
}
