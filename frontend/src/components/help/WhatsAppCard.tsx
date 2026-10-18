/**
 * "Chat on WhatsApp", for phones and computers.
 *
 * A phone has the app, so one green button (wa.me) opens the chat. Most teachers' computers
 * don't, and wa.me there stops on a "Continue to chat" page first. So on a computer the
 * card leads with a QR code to scan with the phone they already chat on, then offers
 * WhatsApp Web and the desktop app.
 *
 * The number itself is never shown (owner's request); it is only inside the links and QR.
 */
import React, { useEffect, useState } from 'react';
import { ExternalLink, Monitor } from 'lucide-react';
import QrCode from '@/components/exams/QrCode';
import { WhatsAppIcon } from '@/components/dashboard/dashboardUi';
import { SUPPORT_HOURS, whatsAppAppUrl, whatsAppGreeting, whatsAppWebUrl } from '@/lib/helpContact';

const PHONE_UA = /Android|iPhone|iPad|iPod|Mobile/i;
const COARSE = '(pointer: coarse)';

/** Phone or tablet: by its user agent, or by a touch-only pointer (iPadOS reports a Mac UA). */
const isTouchDevice = () =>
    typeof window !== 'undefined' && (PHONE_UA.test(navigator.userAgent) || !!window.matchMedia?.(COARSE).matches);

/** Touch-first device (phone or tablet): the WhatsApp app is there to open. */
function useTouchDevice() {
    const [touch, setTouch] = useState(isTouchDevice);
    useEffect(() => {
        const mq = window.matchMedia?.(COARSE);
        if (!mq) return;
        const update = () => setTouch(isTouchDevice());
        update();
        mq.addEventListener?.('change', update);
        return () => mq.removeEventListener?.('change', update);
    }, []);
    return touch;
}

export default function WhatsAppCard({ email }: { email?: string | null }) {
    const touch = useTouchDevice();
    const text = whatsAppGreeting(email);
    const appUrl = whatsAppAppUrl(text);

    return (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.14)] sm:p-5">
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white">
                    <WhatsAppIcon className="h-[22px] w-[22px]" />
                </span>
                <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">Chat on WhatsApp</h2>
                    <p className="text-[13px] text-slate-500">Replies {SUPPORT_HOURS}</p>
                </div>
            </div>

            {touch ? (
                <a
                    href={appUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] text-[15px] font-semibold text-white transition-[filter,transform] hover:brightness-95 motion-safe:active:scale-[0.98]"
                >
                    <WhatsAppIcon className="h-5 w-5" /> Open WhatsApp
                </a>
            ) : (
                <>
                    <div className="mt-4 flex gap-4">
                        <QrCode value={appUrl} size={112} className="shrink-0 ring-1 ring-slate-900/[0.06]" />
                        <div className="min-w-0 self-center">
                            <p className="text-[13px] font-semibold text-slate-800">Scan with your phone</p>
                            <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500">
                                Point the camera at the code. WhatsApp opens with the chat ready.
                            </p>
                        </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <a
                            href={whatsAppWebUrl(text)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#25D366]/10 px-3 text-[13px] font-semibold text-[#128C7E] transition-colors hover:bg-[#25D366]/15"
                        >
                            <ExternalLink className="h-3.5 w-3.5" /> WhatsApp Web
                        </a>
                        <a
                            href={appUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Opens the WhatsApp app on this computer, if it is installed"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-200/80"
                        >
                            <Monitor className="h-3.5 w-3.5" /> Desktop app
                        </a>
                    </div>
                </>
            )}
        </section>
    );
}
