import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReferralShareKit from './ReferralShareKit';

/**
 * Every way to send the invite, over the dashboard: a bottom sheet on a phone, a
 * centred panel on a computer. Who joined lives in Settings → Invite educators.
 */
export default function InviteSheet({ open, onOpenChange, code, name }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    code: string;
    name: string;
}) {
    const navigate = useNavigate();
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-[#1a0540]/55 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
                <Dialog.Content
                    aria-describedby={undefined}
                    className="fixed inset-x-0 bottom-0 z-50 max-h-[92svh] overflow-y-auto rounded-t-[28px] bg-[#f6f3ff] px-3 pb-6 pt-3 shadow-[0_-20px_60px_-20px_rgba(26,5,64,0.5)] focus:outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-8 data-[state=closed]:animate-out data-[state=closed]:fade-out-0
                        md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[min(820px,calc(100vw-48px))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[30px] md:p-5 md:data-[state=open]:slide-in-from-bottom-0 md:data-[state=open]:zoom-in-95"
                >
                    <Dialog.Title className="sr-only">Invite educators</Dialog.Title>
                    <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-violet-300/70 md:hidden" aria-hidden="true" />
                    <Dialog.Close
                        aria-label="Close"
                        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm ring-1 ring-slate-900/[0.06] transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 cursor-pointer md:right-7 md:top-7"
                    >
                        <X className="h-4 w-4" />
                    </Dialog.Close>

                    <ReferralShareKit code={code} name={name} where="dashboard" />

                    <button
                        type="button"
                        onClick={() => { onOpenChange(false); navigate('/settings?tab=referrals'); }}
                        className="mx-auto mt-4 flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-bold text-[#5b21b6] transition-colors hover:bg-white cursor-pointer"
                    >
                        See who joined with your link <ChevronRight className="h-4 w-4" />
                    </button>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
