/** 404 for pdf.testoza.com — served with a real 404 status (dist-pdf/404.html). */
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { TOOL_PAGES } from '../site/routes';
import PannaHeader from '../ui/PannaHeader';

export default function NotFoundPage() {
    return (
        <div className="min-h-[70vh] bg-white font-[Outfit,system-ui,sans-serif]">
            <PannaHeader />
            <main className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
                <p className="text-sm font-semibold text-emerald-700">404</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">This page doesn’t exist</h1>
                <p className="mt-3 text-slate-600">The link may be old or mistyped. These tools are all here:</p>
                <ul className="mx-auto mt-8 grid max-w-xl gap-3 text-left sm:grid-cols-2">
                    {TOOL_PAGES.map((t) => (
                        <li key={t.key}>
                            <Link to={t.path} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 font-medium text-slate-800 hover:border-emerald-300 hover:text-emerald-800">
                                {t.crumb} <ArrowRight className="h-4 w-4" />
                            </Link>
                        </li>
                    ))}
                </ul>
            </main>
        </div>
    );
}
