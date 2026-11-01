/**
 * Admin → Testing Tools.
 *
 * A harness for reviewing work-in-progress surfaces before they go live.
 * Currently hosts Landing Page V2 (see LANDING_PAGE_AUDIT.md).
 *
 * The preview renders inside an iframe rather than inline so that:
 *   • the landing page gets a real viewport to respond to (device toggles work)
 *   • its layout cannot be distorted by the admin shell's sidebar
 *   • its styles and the admin panel's cannot interfere with each other
 */

import { useState } from 'react';
import {
    AlertTriangle, CheckCircle2, ExternalLink, FlaskConical,
    Monitor, RefreshCw, Smartphone, Tablet,
} from 'lucide-react';

type Device = 'desktop' | 'tablet' | 'mobile';

const DEVICES: Record<Device, { label: string; w: number; h: number; icon: typeof Monitor }> = {
    desktop: { label: 'Desktop', w: 1440, h: 900, icon: Monitor },
    tablet: { label: 'Tablet', w: 834, h: 1112, icon: Tablet },
    mobile: { label: 'Mobile', w: 390, h: 844, icon: Smartphone },
};

/** Audit findings this build addresses. Ids match LANDING_PAGE_AUDIT.md. */
const CHANGES = [
    { id: 'C1', text: 'One static, keyword-aligned <h1>. The live hero rotates four slogans containing none of the target keywords — and Google scores the rendered DOM, not the static fallback.' },
    { id: 'C2', text: 'A real hero subheadline. The live one renders an empty &nbsp;, so the first viewport explains nothing.' },
    { id: 'C3', text: 'All ~15 keyword landing pages linked from nav and footer. They are currently orphaned — reachable only via sitemap.' },
    { id: 'C4', text: 'Proof band directly under the hero instead of ~6,000px down.' },
    { id: 'M1', text: 'Names the product category in the first line, the way Google Forms and Microsoft Forms do.' },
    { id: 'M4', text: 'One dominant CTA instead of three competing equally.' },
    { id: 'M3', text: 'Comparison table against Google Forms and Quizizz, drawn from your own FAQ answers.' },
    { id: 'P3', text: 'A concrete hero visual gives a stable LCP element instead of animated text.' },
    { id: '—', text: 'Hero trimmed from 100vh to ~85vh so the next section peeks above the fold.' },
    { id: '—', text: 'Feature showcases trimmed from six to three, alternating sides.' },
];

const HOLDS = [
    'Testimonials are placeholders and are flagged in-page. Replace with real permissioned quotes or delete the section before publishing.',
    'The proof band runs in "capability" mode. The live site shows 10,000+ tests / 5,000+ contributors / 50+ categories; production held 186 / 66 / 14 on 2026-09-23. Do not carry those numbers over.',
    'Comparison claims about Google Forms and Quizizz were accurate as understood on 2026-09-23. Re-verify each one before this goes public.',
    'Links use plain <a href>. On promotion to the public app, swap to react-router <Link> so navigation stays client-side.',
];

export default function AdminTestingToolsPanel() {
    const [device, setDevice] = useState<Device>('desktop');
    const [nonce, setNonce] = useState(0);

    const d = DEVICES[device];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2.5 text-2xl font-bold text-slate-900 dark:text-white">
                        <FlaskConical className="h-6 w-6 text-sky-500" aria-hidden="true" />
                        Testing Tools
                    </h1>
                    <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                        Preview surfaces before they ship. Nothing here is live or indexed.
                    </p>
                </div>
                <a
                    href="/landing-v2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
                >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    Open full screen
                </a>
            </div>

            {/* Safety notice */}
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/40">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-emerald-900 dark:text-emerald-200">
                    <strong>The live landing page is untouched.</strong> V2 exists only inside this admin app —
                    it is not in the public bundle and is not reachable from testoza.com. Nothing replaces the
                    current homepage until you explicitly promote it.
                </p>
            </div>

            {/* Preview */}
            <section
                aria-label="Landing Page V2 preview"
                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                    <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Landing Page V2</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {d.w} × {d.h} · rendered in an isolated frame
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div
                            role="group"
                            aria-label="Preview device size"
                            className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700"
                        >
                            {(Object.keys(DEVICES) as Device[]).map((key) => {
                                const Icon = DEVICES[key].icon;
                                const active = device === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setDevice(key)}
                                        aria-pressed={active}
                                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                            active
                                                ? 'bg-slate-900 text-white dark:bg-sky-600'
                                                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                        }`}
                                    >
                                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                                        <span className="hidden sm:inline">{DEVICES[key].label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => setNonce((n) => n + 1)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="hidden sm:inline">Reload</span>
                        </button>
                    </div>
                </div>

                <div className="flex justify-center overflow-auto p-4 sm:p-6">
                    <div
                        className="shrink-0 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/10 dark:bg-slate-950"
                        style={{
                            width: d.w,
                            height: d.h,
                            maxWidth: '100%',
                            // Scale desktop down to fit the admin panel without distorting layout.
                            transform: device === 'desktop' ? 'scale(0.62)' : 'none',
                            transformOrigin: 'top center',
                            marginBottom: device === 'desktop' ? -d.h * 0.38 : 0,
                        }}
                    >
                        <iframe
                            key={`${device}-${nonce}`}
                            src="/landing-v2"
                            title="Landing Page V2 preview"
                            className="h-full w-full border-0"
                            loading="lazy"
                        />
                    </div>
                </div>
            </section>

            {/* What changed / what's on hold */}
            <div className="grid gap-5 lg:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        What V2 changes
                    </h2>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        Ids refer to findings in <code className="font-mono">LANDING_PAGE_AUDIT.md</code>.
                    </p>
                    <ul className="mt-4 space-y-3">
                        {CHANGES.map((c, i) => (
                            <li key={i} className="flex gap-3">
                                <span className="mt-0.5 shrink-0 rounded bg-sky-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                                    {c.id}
                                </span>
                                <span className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                                    {c.text}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
                    <h2 className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
                        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                        Before you publish
                    </h2>
                    <ul className="mt-4 space-y-3">
                        {HOLDS.map((h, i) => (
                            <li key={i} className="flex gap-2.5">
                                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                                <span className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">{h}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </div>
    );
}
