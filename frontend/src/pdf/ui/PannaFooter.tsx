import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { PANNA, testozaUrl } from '../brand';
import { UPDATED } from '../site/content';
import { TOOL_PAGES } from '../site/routes';
import PannaLogo from './PannaLogo';

const TESTOZA_LINKS = [
    { href: testozaUrl('/'), label: 'Online test maker' },
    { href: testozaUrl('/pdf-to-quiz'), label: 'PDF to quiz' },
    { href: 'https://blog.testoza.com', label: 'Blog' },
    { href: testozaUrl('/about'), label: 'About TestoZa' },
];

const HELP_LINKS = [
    { href: testozaUrl('/support'), label: 'Support' },
    { href: testozaUrl('/privacy-policy'), label: 'Privacy policy' },
    { href: testozaUrl('/terms-and-conditions'), label: 'Terms' },
];

export default function PannaFooter() {
    const col = 'text-sm text-slate-400 transition-colors hover:text-white';
    return (
        <footer className="bg-slate-950 font-[Outfit,system-ui,sans-serif] text-slate-300">
            <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
                <div>
                    <PannaLogo dark />
                    <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">Free PDF tools that keep your documents looking like themselves. Made in India by TestoZa.</p>
                    <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-emerald-300/90">
                        <Lock className="h-3.5 w-3.5" /> Files are processed in your browser — never uploaded.
                    </p>
                </div>
                <nav aria-label="PDF tools">
                    <h2 className="text-sm font-semibold text-white">PDF tools</h2>
                    <ul className="mt-4 space-y-2.5">
                        <li>
                            <Link to={PANNA.routes.home} className={col}>
                                All PDF tools
                            </Link>
                        </li>
                        {TOOL_PAGES.map((t) => (
                            <li key={t.key}>
                                <Link to={t.path} className={col}>
                                    {t.crumb}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
                <nav aria-label="TestoZa">
                    <h2 className="text-sm font-semibold text-white">TestoZa</h2>
                    <ul className="mt-4 space-y-2.5">
                        {TESTOZA_LINKS.map((l) => (
                            <li key={l.href}>
                                <a href={l.href} className={col}>
                                    {l.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
                <nav aria-label="Help">
                    <h2 className="text-sm font-semibold text-white">Help</h2>
                    <ul className="mt-4 space-y-2.5">
                        {HELP_LINKS.map((l) => (
                            <li key={l.href}>
                                <a href={l.href} className={col}>
                                    {l.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
            <div className="border-t border-white/10">
                <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-slate-400 sm:px-6">
                    © {UPDATED.slice(0, 4)} TestoZa Educational Systems. {PANNA.name} is free to use — no sign-up, no watermark.
                </p>
            </div>
        </footer>
    );
}
