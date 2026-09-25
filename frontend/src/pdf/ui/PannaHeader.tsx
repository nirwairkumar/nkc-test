import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { PANNA } from '../brand';
import PannaLogo from './PannaLogo';

const LINKS = [
    { to: PANNA.routes.editor, label: 'PDF Editor' },
    { to: PANNA.routes.latex, label: 'LaTeX to PDF' },
    { to: PANNA.routes.home, label: 'All tools', end: true },
];

export default function PannaHeader() {
    const [open, setOpen] = useState(false);
    const link = ({ isActive }: { isActive: boolean }) =>
        `rounded-lg px-3 py-2 text-[14px] font-medium transition-colors ${isActive ? 'text-emerald-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`;
    return (
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl font-[Outfit,system-ui,sans-serif]">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                <PannaLogo />
                <nav aria-label="Panna" className="hidden items-center gap-1 md:flex">
                    {LINKS.map((l) => (
                        <NavLink key={l.to} to={l.to} end={l.end} className={link}>
                            {l.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="flex items-center gap-2">
                    <Link to="/" className="hidden rounded-lg px-3 py-2 text-[13px] font-medium text-slate-500 hover:text-slate-900 sm:inline-block">
                        TestoZa for teachers ↗
                    </Link>
                    <button type="button" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
                        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>
            {open && (
                <nav className="flex flex-col gap-1 border-t border-slate-200 bg-white px-4 py-3 md:hidden">
                    {LINKS.map((l) => (
                        <NavLink key={l.to} to={l.to} end={l.end} className={link} onClick={() => setOpen(false)}>
                            {l.label}
                        </NavLink>
                    ))}
                    <Link to="/" className="rounded-lg px-3 py-2 text-[14px] font-medium text-slate-500" onClick={() => setOpen(false)}>
                        TestoZa for teachers ↗
                    </Link>
                </nav>
            )}
        </header>
    );
}
