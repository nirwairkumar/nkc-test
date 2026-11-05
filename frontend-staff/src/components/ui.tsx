import { AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';
import React, { useState } from 'react';

export function cx(...parts: Array<string | false | null | undefined>): string {
    return parts.filter(Boolean).join(' ');
}

export const CARD = 'rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.14)]';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    busy?: boolean;
    size?: 'md' | 'lg' | 'sm';
};

export function Button({ variant = 'primary', busy, size = 'md', className, children, disabled, ...rest }: ButtonProps) {
    const tones = {
        primary: 'bg-slate-900 text-white hover:bg-slate-800',
        secondary: 'bg-white text-slate-800 ring-1 ring-slate-900/[0.1] hover:bg-slate-50',
        ghost: 'text-slate-600 hover:bg-slate-100',
        danger: 'bg-white text-rose-600 ring-1 ring-rose-600/20 hover:bg-rose-50',
    };
    const sizes = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-4 text-[14px]', lg: 'h-12 px-5 text-[15px]' };
    return (
        <button
            {...rest}
            disabled={disabled || busy}
            className={cx(
                'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 disabled:cursor-not-allowed disabled:opacity-50',
                tones[variant], sizes[size], className,
            )}
        >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {children}
        </button>
    );
}

export const INPUT =
    'h-12 w-full rounded-xl bg-white px-3.5 text-[16px] text-slate-900 ring-1 ring-slate-900/[0.12] placeholder:text-slate-400 ' +
    'focus:outline-none focus:ring-2 focus:ring-indigo-500/60 disabled:bg-slate-100';

export function Field({ label, hint, children, id }: { label: string; hint?: React.ReactNode; children: React.ReactNode; id: string }) {
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-slate-700">{label}</label>
            {children}
            {hint && <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">{hint}</p>}
        </div>
    );
}

export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input {...props} type={show ? 'text' : 'password'} className={cx(INPUT, 'pr-12')} />
            <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 hover:text-slate-700"
                aria-label={show ? 'Hide password' : 'Show password'}
            >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
        </div>
    );
}

export type ChipTone = 'slate' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';

export function Chip({ children, tone = 'slate', className, title }: {
    children: React.ReactNode;
    tone?: ChipTone;
    className?: string;
    title?: string;
}) {
    const tones = {
        slate: 'bg-slate-100 text-slate-600',
        violet: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/15',
        indigo: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/15',
        emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15',
        amber: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20',
        rose: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/15',
        sky: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/15',
    };
    return (
        <span title={title} className={cx('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', tones[tone], className)}>
            {children}
        </span>
    );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
    return (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
                <h1 className="text-[22px] font-bold tracking-[-0.02em] text-slate-900 md:text-[26px]">{title}</h1>
                {subtitle && <p className="mt-1 text-[14px] text-slate-500">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

export function Empty({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children?: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-3 text-[15px] font-semibold text-slate-900">{title}</p>
            {children && <div className="mt-1 max-w-sm text-[13px] leading-relaxed text-slate-500">{children}</div>}
        </div>
    );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div className={cx(CARD, 'flex items-start gap-3 p-4')} role="alert">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="min-w-0 flex-1 pt-1.5 text-[14px] text-slate-700">{message}</p>
            {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button>}
        </div>
    );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
    return (
        <div className="flex items-center justify-center gap-2 py-16 text-[14px] text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {label}
        </div>
    );
}

export function Skeleton({ className }: { className?: string }) {
    return <div className={cx('animate-pulse rounded-xl bg-slate-200/70', className)} />;
}

export function Logo({ className }: { className?: string }) {
    return (
        <span className={cx('inline-flex items-center gap-2', className)}>
            <span className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-slate-900 text-[15px] font-black text-white">
                T
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-2 ring-white" />
            </span>
            <span className="text-[15px] font-bold tracking-tight text-slate-900">
                TestoZa <span className="font-semibold text-indigo-600">Team</span>
            </span>
        </span>
    );
}

/** Six-digit code box: numeric keyboard on phones, accepts paste, auto-fills from SMS-style hints. */
export function CodeInput({ value, onChange, onComplete, disabled, id }: {
    value: string;
    onChange: (v: string) => void;
    onComplete?: (v: string) => void;
    disabled?: boolean;
    id: string;
}) {
    return (
        <input
            id={id}
            value={value}
            disabled={disabled}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="••••••"
            onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                onChange(digits);
                if (digits.length === 6) onComplete?.(digits);
            }}
            className={cx(INPUT, 'h-14 text-center font-mono text-[26px] tracking-[0.5em] placeholder:tracking-[0.5em]')}
        />
    );
}
