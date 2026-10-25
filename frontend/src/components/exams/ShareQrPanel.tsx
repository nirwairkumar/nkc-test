import React, { useState } from 'react';
import QrCode from '@/components/exams/QrCode';
import { SHARE_APPS, type ShareAppId, shareAppById, shareQrUrl } from './shareApps';

/**
 * "Scan to share" beside a live exam: the examiner points their phone at it and the
 * invitation opens in the app they picked below the code (or the phone's share sheet).
 * Desktop only; on a phone the Share button already does this.
 */
export default function ShareQrPanel({ test, className = '' }: { test: any; className?: string }) {
    const [appId, setAppId] = useState<ShareAppId>('any');
    const app = shareAppById(appId);
    const url = shareQrUrl(test, appId);

    return (
        <div
            className={`w-[168px] rounded-2xl bg-gradient-to-b from-white to-slate-50/80 px-3 pb-2.5 pt-2 ring-1 ring-slate-900/[0.07] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_30px_-20px_rgba(15,23,42,0.45)] ${className}`}
        >
            <p className="text-center text-[12.5px] font-semibold tracking-[-0.01em] text-slate-900">Scan to share</p>
            <p className="mt-0.5 truncate text-center text-[11px] text-slate-500" title={app.hint}>{app.hint}</p>

            <div className="relative mx-auto mt-1.5 h-[112px] w-[112px]">
                <QrCode key={url} value={url} size={112} level="Q" margin={2} className="!rounded-lg bg-white ring-1 ring-slate-900/[0.06]" />
                {/* The picked app in the middle of the code, like a branded QR. */}
                <span
                    className="pointer-events-none absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[7px] bg-white shadow-[0_1px_4px_rgba(15,23,42,0.2)] ring-2 ring-white"
                    style={{ color: app.color }}
                    aria-hidden="true"
                >
                    {appId === 'any'
                        ? <img src="/logo-testoza-icon.svg" alt="" className="h-4 w-4" />
                        : <app.Icon className="h-[15px] w-[15px]" />}
                </span>
            </div>

            <div role="radiogroup" aria-label="Share to" className="mt-2 flex items-center justify-center gap-1">
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
                            onClick={() => setAppId(a.id)}
                            className={`flex h-6 w-6 items-center justify-center rounded-full transition-[background-color,color,transform,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 cursor-pointer ${on ? 'scale-110 text-white shadow-[0_4px_10px_-4px_rgba(15,23,42,0.5)]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'}`}
                            style={on ? { backgroundColor: a.color } : undefined}
                        >
                            <a.Icon className="h-3.5 w-3.5" />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
