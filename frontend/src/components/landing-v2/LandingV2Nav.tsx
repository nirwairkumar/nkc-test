import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS } from './content';
import { useAuth } from '@/contexts/AuthContext';

export default function LandingV2Nav() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user } = useAuth();

    // Nav gains a surface only once the hero starts scrolling away — it floats
    // over the hero at rest, which is what keeps the first viewport feeling open.
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header
            className={`sticky top-0 z-40 transition-colors duration-300 ${
                scrolled
                    ? 'border-b border-white/[0.07] bg-[#020617]/85 backdrop-blur-xl'
                    : 'border-b border-transparent bg-transparent'
            }`}
        >
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <a
                    href="#hero-heading"
                    className="flex items-baseline text-xl font-bold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
                >
                    <span className="text-sky-400">Testo</span>
                    <span
                        className="mx-[0.02em] text-[1.26em] font-black"
                        style={{
                            background: 'linear-gradient(to bottom, #FFE885, #F4B838, #9E6400)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Z
                    </span>
                    <span className="text-sky-400">a</span>
                </a>

                {/* Pricing and anchor links */}
                <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
                    {NAV_LINKS.map((l) => (
                        <a
                            key={l.href}
                            href={l.href}
                            className="rounded-lg px-3.5 py-2 text-[13.5px] font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                        >
                            {l.label}
                        </a>
                    ))}
                </nav>

                <div className="flex items-center gap-2">
                    {user ? (
                        <Link
                            to="/dashboard"
                            className="hidden rounded-lg px-3.5 py-2 text-[13.5px] font-medium text-slate-300 transition-colors hover:text-white sm:inline-block"
                        >
                            Dashboard
                        </Link>
                    ) : (
                        <Link
                            to="/login"
                            className="hidden rounded-lg px-3.5 py-2 text-[13.5px] font-medium text-slate-300 transition-colors hover:text-white sm:inline-block"
                        >
                            Log in
                        </Link>
                    )}
                    <Link
                        to="/generate-with-ai"
                        className="rounded-lg bg-gradient-to-b from-sky-400 to-sky-600 px-4 py-2 text-[13.5px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.22)_inset,0_6px_16px_-6px_rgba(2,132,199,0.8)] transition-transform duration-200 motion-safe:hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                    >
                        Start free
                    </Link>

                    {/* Mobile menu toggle */}
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="rounded-lg p-2 text-slate-300 hover:bg-white/[0.06] hover:text-white md:hidden"
                        aria-label="Toggle navigation menu"
                    >
                        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu dropdown */}
            {mobileMenuOpen && (
                <div className="border-b border-white/[0.07] bg-[#020617]/95 px-6 py-4 backdrop-blur-xl md:hidden">
                    <nav className="flex flex-col space-y-3">
                        {NAV_LINKS.map((l) => (
                            <a
                                key={l.href}
                                href={l.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
                            >
                                {l.label}
                            </a>
                        ))}
                        <div className="pt-2 border-t border-white/[0.08] flex flex-col gap-2">
                            {user ? (
                                <Link
                                    to="/dashboard"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <Link
                                    to="/login"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
                                >
                                    Log in
                                </Link>
                            )}
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
