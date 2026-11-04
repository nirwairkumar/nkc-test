import { Lock } from 'lucide-react';
import React from 'react';
import { CARD, Logo, cx } from '@/components/ui';

/** Centered card used by sign-in and the first-login steps. */
export default function AuthLayout({ step, title, subtitle, children, footer }: {
    step?: { at: number; of: number };
    title: string;
    subtitle?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    return (
        <div className="flex min-h-[100dvh] flex-col items-center bg-slate-50 px-4 pb-10 pt-10 md:justify-center md:pt-0">
            <Logo className="mb-6" />
            <main className={cx(CARD, 'w-full max-w-[420px] p-6 md:p-8')}>
                {step && (
                    <div className="mb-5 flex items-center gap-2" aria-label={`Step ${step.at} of ${step.of}`}>
                        {Array.from({ length: step.of }, (_, i) => (
                            <span key={i} className={cx('h-1.5 flex-1 rounded-full', i < step.at ? 'bg-indigo-600' : 'bg-slate-200')} />
                        ))}
                    </div>
                )}
                <h1 className="text-[22px] font-bold tracking-[-0.02em] text-slate-900">{title}</h1>
                {subtitle && <div className="mt-1.5 text-[14px] leading-relaxed text-slate-500">{subtitle}</div>}
                <div className="mt-6">{children}</div>
            </main>
            {footer && <div className="mt-5 max-w-[420px] text-center text-[13px] leading-relaxed text-slate-500">{footer}</div>}
            <p className="mt-8 flex items-center gap-1.5 text-[12px] text-slate-400">
                <Lock className="h-3 w-3" aria-hidden="true" /> TestoZa staff only. Every sign-in is recorded.
            </p>
        </div>
    );
}
