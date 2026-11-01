/**
 * Content sections shared by the pdf.testoza.com pages. Answers are always
 * visible (not collapsed) so readers, search engines and AI answer engines all
 * get the full text on load.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, Check, X } from 'lucide-react';
import { PANNA, testozaUrl } from '../brand';
import { UPDATED, UPDATED_LABEL, type Faq, type Step } from '../site/content';
import { TOOL_PAGES, type PageKey } from '../site/routes';

/**
 * "What is …" + facts table, right below the hero: the self-contained answer an
 * AI assistant or search snippet can quote about the tool.
 */
export function QuickFacts({ heading, definition, facts }: { heading: string; definition: string; facts: [string, string][] }) {
    return (
        <section aria-labelledby="what-is" className="mx-auto max-w-6xl px-4 pb-4 pt-2 sm:px-6">
            <div className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 lg:grid-cols-[1.15fr_1fr]">
                <div>
                    <h2 id="what-is" className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                        {heading}
                    </h2>
                    <p className="mt-3 leading-relaxed text-slate-700">{definition}</p>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                    {facts.map(([k, v]) => (
                        <div key={k} className="contents">
                            <dt className="font-semibold text-slate-900">{k}</dt>
                            <dd className="text-slate-600">{v}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    );
}

export function HowToSteps({ heading, intro, steps }: { heading: string; intro?: string; steps: Step[] }) {
    return (
        <section aria-labelledby="how-to" className="cv-auto mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 id="how-to" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {heading}
            </h2>
            {intro && <p className="mt-2 max-w-3xl text-slate-600">{intro}</p>}
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
                {steps.map((s, i) => (
                    <li key={s.title} className="relative rounded-2xl border border-slate-200 bg-white p-5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white" aria-hidden="true">
                            {i + 1}
                        </span>
                        <h3 className="mt-3 font-semibold text-slate-900">{s.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.text}</p>
                    </li>
                ))}
            </ol>
        </section>
    );
}

export function FaqSection({ heading = 'Frequently asked questions', faqs }: { heading?: string; faqs: Faq[] }) {
    return (
        <section aria-labelledby="faq" className="border-t border-slate-200/70 bg-slate-50/70">
            <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                <h2 id="faq" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    {heading}
                </h2>
                <dl className="mt-8 grid gap-4 md:grid-cols-2">
                    {faqs.map((f) => (
                        <div key={f.q} className="rounded-2xl border border-slate-200 bg-white p-5">
                            <dt>
                                <h3 className="font-semibold text-slate-900">{f.q}</h3>
                            </dt>
                            <dd className="mt-2 text-sm leading-relaxed text-slate-600">{f.a}</dd>
                        </div>
                    ))}
                </dl>
                <p className="mt-8 text-xs text-slate-500">
                    Last updated <time dateTime={UPDATED}>{UPDATED_LABEL}</time> by the{' '}
                    <a href={testozaUrl('/about')} className="font-medium text-slate-600 underline-offset-2 hover:underline">
                        TestoZa team
                    </a>
                    .
                </p>
            </div>
        </section>
    );
}

function Cell({ v }: { v: boolean | string }) {
    if (v === true) return <Check className="mx-auto h-5 w-5 text-emerald-600" aria-label="Yes" />;
    if (v === false) return <X className="mx-auto h-5 w-5 text-slate-300" aria-label="No" />;
    return <span className="text-[13px] text-slate-500">{v}</span>;
}

export function CompareTable({ heading, intro, rows }: { heading: string; intro?: string; rows: [string, boolean | string, boolean | string][] }) {
    return (
        <section aria-labelledby="compare" className="cv-auto mx-auto max-w-4xl px-4 py-14 sm:px-6">
            <h2 id="compare" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {heading}
            </h2>
            {intro && <p className="mt-2 text-slate-600">{intro}</p>}
            <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-slate-50 text-[13px] text-slate-600">
                        <tr>
                            <th scope="col" className="px-4 py-3 font-medium">
                                Feature
                            </th>
                            <th scope="col" className="w-32 px-4 py-3 text-center font-semibold text-emerald-700">
                                {PANNA.name}
                            </th>
                            <th scope="col" className="w-44 px-4 py-3 text-center font-medium">
                                Typical online editor
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map(([label, a, b]) => (
                            <tr key={label}>
                                <th scope="row" className="px-4 py-3 font-medium text-slate-800">
                                    {label}
                                </th>
                                <td className="px-4 py-3 text-center">
                                    <Cell v={a} />
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <Cell v={b} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

const TOOL_BLURB: Record<string, string> = {
    editor: 'Change text in the PDF’s own font, erase for real, sign and annotate.',
    hindi: 'Edit Hindi (Devanagari) text with correct matras and conjuncts.',
    latex: 'Paste LaTeX or AI maths and download a typeset PDF.',
    chatgpt: 'Save ChatGPT, Gemini or Claude answers as a clean PDF.',
};

/** Links to the other tools: helps people (and crawlers) find the whole set. */
export function RelatedTools({ current }: { current?: PageKey }) {
    const tools = TOOL_PAGES.filter((t) => t.key !== current);
    return (
        <section aria-labelledby="more-tools" className="cv-auto mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 id="more-tools" className="text-2xl font-bold tracking-tight text-slate-900">
                More free PDF tools
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((t) => (
                    <li key={t.key}>
                        <Link to={t.path} className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-emerald-300 hover:shadow-[0_16px_32px_-24px_rgba(5,150,105,0.5)]">
                            <span className="font-semibold text-slate-900">{t.crumb}</span>
                            <span className="mt-1 flex-1 text-sm text-slate-600">{TOOL_BLURB[t.key]}</span>
                            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                                Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}

/** Screenshot of the tool with fixed dimensions (no layout shift) and lazy loading. */
export function Screenshot({ src, alt, width = 1280, height = 800 }: { src: string; alt: string; width?: number; height?: number }) {
    // Phones get the 640 px copy (~18 KB instead of ~55 KB).
    const small = src.replace(/\.webp$/, '-640.webp');
    return (
        <figure className="cv-auto mx-auto max-w-5xl px-4 sm:px-6">
            <img
                src={src}
                srcSet={`${small} 640w, ${src} 1280w`}
                sizes="(max-width: 1024px) 100vw, 1024px"
                alt={alt}
                width={width}
                height={height}
                loading="lazy"
                decoding="async"
                className="h-auto w-full rounded-2xl border border-slate-200 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)]"
            />
            <figcaption className="mt-3 text-center text-sm text-slate-500">{alt}</figcaption>
        </figure>
    );
}
