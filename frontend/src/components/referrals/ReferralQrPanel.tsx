import React, { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { AppChips, BrandedQr, FullScreenQr } from '@/components/exams/ShareQrPanel';
import { type ShareAppId, shareAppById } from '@/components/exams/shareApps';
import { inviteShareQrUrl } from '@/lib/referral';
import { analytics } from '@/lib/analytics/tracker';

/**
 * "Scan to share" for the invite link, the same way a live exam is shared from a computer:
 * the educator scans it with their own phone and the invite opens in WhatsApp (or the app
 * they picked), ready to send. The phone side is pages/ShareInvitePage.
 *
 * The QR holds app.testoza.com/share-invite/<CODE>?to=wa, about 53 characters: QR version 5
 * at level Q, so it scans at 112 px with the app badge over the middle.
 */
export default function ReferralQrPanel({ code, className = '' }: { code: string; className?: string }) {
    const [appId, setAppId] = useState<ShareAppId>('whatsapp');
    const [fullScreen, setFullScreen] = useState(false);
    const app = shareAppById(appId);
    const url = inviteShareQrUrl(code, app.code);

    return (
        <div className={`relative flex flex-col items-center px-3 pb-3 pt-3 ${className}`}>
            <button
                type="button"
                onClick={() => { setFullScreen(true); analytics.track('referral_qr_fullscreen'); }}
                aria-label="Show this QR full screen"
                title="Full screen"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-violet-50 hover:text-[#5b21b6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 cursor-pointer"
            >
                <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <p className="text-[13px] font-extrabold tracking-[-0.01em] text-[#2e0a6b]">Scan to share</p>
            <p className="mt-0.5 max-w-[170px] truncate text-center text-[11px] text-slate-500" title={app.hint}>{app.hint}</p>
            <div className="mt-2 rounded-2xl bg-white p-1.5 ring-1 ring-violet-200/70">
                <BrandedQr url={url} app={app} size={112} />
            </div>
            <AppChips appId={appId} onPick={setAppId} className="mt-2.5" />

            {fullScreen && (
                <FullScreenQr
                    title={`Your invite link · ${code}`}
                    appId={appId}
                    url={url}
                    onPick={setAppId}
                    onClose={() => setFullScreen(false)}
                />
            )}
        </div>
    );
}
