/**
 * Landing V2 — comparison, testimonials, FAQ, final CTA, footer.
 *
 * The footer is the single highest-ROI SEO change on the page: the live footer
 * has five links and the live navbar links to none of the ~15 keyword landing
 * pages that already exist (audit C3). Here every one of them is linked.
 */

import { useState } from 'react';
import { ArrowRight, Check, ChevronDown, Minus, Quote, X } from 'lucide-react';
import {
    COMPARISON, FAQS, FOOTER_LINKS,
    TESTIMONIALS, TESTIMONIALS_ARE_PLACEHOLDER,
} from './content';
import { Grain, Orb, Pill, Reveal, Section, SectionHeading, Surface } from './ui';

/* ── 6. Comparison table (audit M3) ─────────────────────────────────────── */

function Cell({ v }: { v: boolean | string }) {
    if (v === true)
        return (
            <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-label="Yes" />
            </span>
        );
    if (v === false)
        return (
            <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-white/[0.04]">
                <X className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" aria-label="No" />
            </span>
        );
    return (
        <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
            <Minus className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-label="Partial" />
        </span>
    );
}

export function Comparison() {
    return (
        <Section id="compare">
            <div className="mx-auto max-w-5xl px-6">
                <SectionHeading
                    kicker="Comparison"
                    title="Google Forms, Moodle, or TestoZa?"
                    sub="Forms is a survey tool. Moodle is a full LMS you host and maintain. If what you actually need is to set a paper and conduct it, here is where the three diverge."
                />

                <Reveal>
                    <Surface className="mt-14">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[680px] border-collapse text-sm">
                                <caption className="sr-only">
                                    Feature comparison between TestoZa, Google Forms, Moodle and Quizizz
                                </caption>
                                <thead>
                                    <tr>
                                        <th scope="col" className="px-6 py-5 text-left text-[13px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Capability
                                        </th>
                                        {COMPARISON.columns.map((c, i) => (
                                            <th
                                                key={c}
                                                scope="col"
                                                className={`px-4 py-5 text-center text-sm font-bold ${
                                                    i === 0
                                                        ? 'relative text-sky-700 dark:text-sky-300'
                                                        : 'text-slate-500 dark:text-slate-400'
                                                }`}
                                            >
                                                {i === 0 && (
                                                    <span
                                                        aria-hidden="true"
                                                        className="absolute inset-x-1 inset-y-0 -z-[1] rounded-t-xl bg-gradient-to-b from-sky-50 to-transparent dark:from-sky-500/10"
                                                    />
                                                )}
                                                {c}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {COMPARISON.rows.map((r, ri) => (
                                        <tr
                                            key={r.feature}
                                            className="border-t border-slate-100 dark:border-white/[0.05]"
                                        >
                                            <th
                                                scope="row"
                                                className={`px-6 py-4 text-left text-[14px] font-medium text-slate-700 dark:text-slate-300 ${
                                                    ri % 2 ? 'bg-slate-50/50 dark:bg-white/[0.015]' : ''
                                                }`}
                                            >
                                                {r.feature}
                                            </th>
                                            {r.values.map((v, vi) => (
                                                <td
                                                    key={vi}
                                                    className={`px-4 py-4 text-center ${
                                                        vi === 0 ? 'bg-sky-50/40 dark:bg-sky-500/[0.04]' : ri % 2 ? 'bg-slate-50/50 dark:bg-white/[0.015]' : ''
                                                    }`}
                                                >
                                                    <Cell v={v} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Surface>
                </Reveal>

                <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-relaxed text-slate-500 dark:text-slate-500">
                    {COMPARISON.footnote}
                </p>
            </div>
        </Section>
    );
}

/* ── 7. Testimonials (audit C4) ─────────────────────────────────────────── */

export function Testimonials() {
    return (
        <Section tone="muted">
            <div className="mx-auto max-w-5xl px-6">
                {TESTIMONIALS_ARE_PLACEHOLDER && (
                    <div
                        role="note"
                        className="mx-auto mb-12 max-w-2xl rounded-2xl border-2 border-dashed border-amber-400/70 bg-amber-50 px-6 py-5 text-center dark:border-amber-600/50 dark:bg-amber-950/25"
                    >
                        <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                            Placeholder — do not publish
                        </p>
                        <p className="mt-1.5 text-xs leading-relaxed text-amber-800 dark:text-amber-300/90">
                            Replace with real, permissioned quotes, or delete this section entirely.
                            A page with no testimonials is honest; one with invented testimonials is not.
                            Flip <code className="rounded bg-amber-100 px-1 font-mono dark:bg-amber-900/50">TESTIMONIALS_ARE_PLACEHOLDER</code> in{' '}
                            <code className="rounded bg-amber-100 px-1 font-mono dark:bg-amber-900/50">content.ts</code> once they are real.
                        </p>
                    </div>
                )}

                <SectionHeading kicker="From teachers" title="What educators say" />

                <div className="mt-14 grid gap-6 md:grid-cols-2">
                    {TESTIMONIALS.map((t, i) => (
                        <Reveal key={i} delay={i * 100}>
                            <Surface as="figure" lift className="flex h-full flex-col p-8">
                                <Quote className="h-7 w-7 text-sky-200 dark:text-sky-500/30" aria-hidden="true" />
                                <blockquote className="mt-5 flex-1 text-pretty text-[15px] leading-[1.7] text-slate-700 dark:text-slate-300">
                                    {t.quote}
                                </blockquote>
                                <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5 dark:border-white/[0.06]">
                                    <span
                                        aria-hidden="true"
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-sm font-bold text-slate-500 dark:from-white/10 dark:to-white/5 dark:text-slate-400"
                                    >
                                        {t.name.charAt(0)}
                                    </span>
                                    <span>
                                        <span className="block text-sm font-semibold text-slate-900 dark:text-white">{t.name}</span>
                                        <span className="block text-xs text-slate-500 dark:text-slate-400">{t.role}</span>
                                    </span>
                                </figcaption>
                            </Surface>
                        </Reveal>
                    ))}
                </div>
            </div>
        </Section>
    );
}

/* ── 9. FAQ (audit T4 — best content on the site, kept verbatim) ────────── */

export function Faq() {
    const [open, setOpen] = useState<number | null>(0);

    return (
        <Section id="faq" tone="muted">
            <div className="mx-auto max-w-3xl px-6">
                <SectionHeading
                    kicker="FAQ"
                    title="Questions teachers actually ask"
                    sub="If yours isn't here, support replies within a working day."
                />

                <div className="mt-14 space-y-3">
                    {FAQS.map((f, i) => {
                        const isOpen = open === i;
                        return (
                            <Surface
                                key={f.q}
                                className={`transition-colors duration-200 ${isOpen ? 'border-sky-300/70 dark:border-sky-400/20' : ''}`}
                            >
                                <h3>
                                    <button
                                        type="button"
                                        onClick={() => setOpen(isOpen ? null : i)}
                                        aria-expanded={isOpen}
                                        aria-controls={`faq-panel-${i}`}
                                        id={`faq-button-${i}`}
                                        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-500"
                                    >
                                        <span className="text-[15px] font-semibold text-slate-900 dark:text-white">{f.q}</span>
                                        <span
                                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                                                isOpen
                                                    ? 'rotate-180 bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300'
                                                    : 'bg-slate-100 text-slate-400 dark:bg-white/[0.05]'
                                            }`}
                                        >
                                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                        </span>
                                    </button>
                                </h3>
                                {/* Always in the DOM — hidden panels still get indexed (audit T3). */}
                                <div
                                    id={`faq-panel-${i}`}
                                    role="region"
                                    aria-labelledby={`faq-button-${i}`}
                                    hidden={!isOpen}
                                    className="px-6 pb-6"
                                >
                                    <p className="text-pretty text-sm leading-[1.75] text-slate-600 dark:text-slate-400">
                                        {f.a}
                                    </p>
                                </div>
                            </Surface>
                        );
                    })}
                </div>
            </div>
        </Section>
    );
}

/* ── 10. Final CTA ──────────────────────────────────────────────────────── */

export function FinalCta() {
    return (
        <section className="relative isolate overflow-hidden bg-[#020617] py-24 sm:py-32">
            <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: 'linear-gradient(140deg, #0b1120 0%, #111c3d 45%, #062a3f 100%)' }}
            />
            <Orb className="left-1/2 top-[-30%] -translate-x-1/2" color="rgba(56,189,248,0.28)" size={700} />
            <div
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.05]"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)',
                    backgroundSize: '64px 64px',
                    maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000, transparent)',
                    WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000, transparent)',
                }}
            />
            <Grain opacity={0.04} />

            <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
                <h2 className="text-balance text-3xl font-bold tracking-[-0.025em] text-white sm:text-[2.75rem] sm:leading-[1.1]">
                    Set your next paper in ten minutes
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-[1.7] text-slate-300/90 sm:text-[17px]">
                    Upload a chapter PDF and see what the AI drafts. If it isn't useful, you've lost ten minutes.
                </p>
                <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <a
                        href="/generate-with-ai"
                        className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-sky-400 to-sky-600 px-8 py-4 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_12px_32px_-10px_rgba(2,132,199,0.75)] transition-transform duration-200 motion-safe:hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 sm:w-auto"
                    >
                        <span
                            aria-hidden="true"
                            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                        />
                        <span className="relative">Generate a test with AI</span>
                        <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </a>
                    <a
                        href="/pricing"
                        className="inline-flex w-full items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] px-8 py-4 text-[15px] font-semibold text-slate-100 backdrop-blur-sm transition-colors hover:border-white/25 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 sm:w-auto"
                    >
                        See pricing
                    </a>
                </div>
                <p className="mt-6 text-sm text-slate-400">Free forever for teachers · No card required</p>
            </div>
        </section>
    );
}

/* ── 11. Footer — the SEO link hub (audit C3) ───────────────────────────── */

function Wordmark({ size = 'text-2xl' }: { size?: string }) {
    return (
        <p className={`flex items-baseline font-bold tracking-tight ${size}`}>
            <span className="text-sky-500 dark:text-sky-400">Testo</span>
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
            <span className="text-sky-500 dark:text-sky-400">a</span>
        </p>
    );
}

export function LandingV2Footer() {
    return (
        <footer className="border-t border-slate-200 bg-white dark:border-white/[0.06] dark:bg-slate-950">
            <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
                <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5 lg:gap-8">
                    <div className="lg:col-span-1">
                        <Wordmark />
                        <p className="mt-4 max-w-xs text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                            The free online test maker for teachers, coaching institutes and schools.
                        </p>
                    </div>

                    {FOOTER_LINKS.map((col) => (
                        <nav key={col.title} aria-labelledby={`footer-${col.title}`}>
                            <h2
                                id={`footer-${col.title}`}
                                className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-900 dark:text-white"
                            >
                                {col.title}
                            </h2>
                            <ul className="mt-5 space-y-3">
                                {col.links.map((l) => (
                                    <li key={l.href}>
                                        <a
                                            href={l.href}
                                            className="text-sm text-slate-600 transition-colors hover:text-sky-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 dark:text-slate-400 dark:hover:text-sky-400"
                                        >
                                            {l.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    ))}
                </div>

                <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-8 dark:border-white/[0.06] sm:flex-row">
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                        © {new Date().getFullYear()} TestoZa Educational Systems. All rights reserved.
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">Made for educators in India 🇮🇳</p>
                </div>
            </div>
        </footer>
    );
}
