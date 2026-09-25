import { Link } from 'react-router-dom';
import { PANNA } from '../brand';

/** A page with a folded corner and a pen stroke — the Panna mark. */
export function PannaMark({ className = 'h-8 w-8' }: { className?: string }) {
    return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
            <defs>
                <linearGradient id="panna-g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#34d399" />
                    <stop offset="1" stopColor="#047857" />
                </linearGradient>
            </defs>
            <path d="M7 3h13l7 7v17a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="url(#panna-g)" />
            <path d="M20 3v5a2 2 0 0 0 2 2h5z" fill="#a7f3d0" />
            <path d="M10 22.5c2.2-3.6 4.1-5.4 5.6-5.4 2 0 .4 4.1 2.3 4.1 1.1 0 2.2-1.3 3.6-3.4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export default function PannaLogo({ to = PANNA.routes.home, compact = false, dark = false }: { to?: string; compact?: boolean; dark?: boolean }) {
    return (
        <Link
            to={to}
            className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            // With the wordmark shown, its text ("Panna by TestoZa") is the link's name.
            aria-label={compact ? `${PANNA.name} home` : undefined}
        >
            <PannaMark />
            {!compact && (
                <span className="flex flex-col leading-none">
                    <span className={`font-[Outfit,system-ui,sans-serif] text-[19px] font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>{PANNA.name}</span>
                    <span className={`mt-0.5 text-[10px] font-medium tracking-wide ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>{PANNA.by}</span>
                </span>
            )}
        </Link>
    );
}
