import React from 'react';
import { ChevronRight, Crown, Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { CARD } from '@/components/dashboard/dashboardUi';

/** Settings → Subscription. */
export default function BillingSettings() {
    const navigate = useNavigate();
    const { isPremium, loading } = usePremiumStatus();

    return (
        <div className="space-y-3">
            {loading ? (
                <div className={`${CARD} flex justify-center p-8`}>
                    <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
                </div>
            ) : isPremium ? (
                <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 shadow-[0_16px_34px_-22px_rgba(5,150,105,0.9)]">
                    <div className="mb-4 flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                            <Crown className="h-5 w-5 text-white" />
                        </span>
                        <div>
                            <p className="text-[16px] font-bold text-white">Pro subscription active</p>
                            <p className="text-[12.5px] text-emerald-50">Full access to every premium feature</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/pricing')}
                        className="inline-flex h-11 w-full items-center justify-center gap-1 rounded-xl bg-white text-[14px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 cursor-pointer"
                    >
                        Manage or extend plan <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            ) : (
                <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-sky-900 p-5 shadow-[0_16px_34px_-22px_rgba(15,23,42,0.9)]">
                    <div className="mb-4 flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                            <Sparkles className="h-5 w-5 text-sky-300" />
                        </span>
                        <div>
                            <p className="text-[16px] font-bold text-white">No active subscription</p>
                            <p className="text-[12.5px] text-slate-300">Unlock analytics, custom branding and more</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/pricing')}
                        className="inline-flex h-11 w-full items-center justify-center gap-1 rounded-xl bg-sky-500 text-[14px] font-semibold text-white transition-colors hover:bg-sky-600 cursor-pointer"
                    >
                        View plans <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            )}

            <p className={`${CARD} px-4 py-3 text-center text-[12.5px] text-slate-500`}>
                For billing help or refunds, write to{' '}
                <a href="mailto:support@testoza.com" className="font-semibold text-sky-700 hover:underline">support@testoza.com</a>
            </p>
        </div>
    );
}
