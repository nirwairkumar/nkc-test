/**
 * Landing V2 — hero.
 *
 * Structure fixes (LANDING_PAGE_AUDIT.md):
 *   C1  one STATIC keyword <h1>; the rotating text moved to a sub-line
 *   C2  a real subheadline (the live hero renders `&nbsp;`)
 *   M4  one dominant CTA instead of three equal ones
 *   P3  a concrete visual gives a stable, optimisable LCP element
 *   —   ~88vh, not 100vh, so the next section peeks above the fold
 *
 * Visual approach: layered light sources over near-black, a fine exam-paper
 * grid, and grain to stop the gradient banding. The headline uses a tight
 * tracking and a large optical size — the single biggest lever on whether a
 * hero reads as "enterprise" or "template".
 */

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, PlayCircle, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { HERO } from './content';
import ExamMock from './ExamMock';
import { Grain, Orb } from './ui';

const TRUST = [
    { icon: Zap, label: 'PDF to paper in under 2 minutes' },
    { icon: ShieldCheck, label: 'Proctoring built in' },
    { icon: Sparkles, label: 'No student limit, ever' },
];

export default function LandingV2Hero() {
    const [wordIndex, setWordIndex] = useState(0);
    const [visible, setVisible] = useState(true);
    const reduced = useRef(false);

    useEffect(() => {
        reduced.current =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced.current) return;

        const id = setInterval(() => {
            setVisible(false);
            setTimeout(() => {
                setWordIndex((i) => (i + 1) % HERO.rotating.length);
                setVisible(true);
            }, 280);
        }, 2800);
        return () => clearInterval(id);
    }, []);

    return (
        <section className="relative isolate overflow-hidden bg-[#020617]" aria-labelledby="hero-heading">
            {/* ── Light stack ── */}
            <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: 'linear-gradient(180deg, #0b1120 0%, #020617 60%, #020617 100%)' }}
            />
            <Orb className="-top-40 left-1/2 -translate-x-1/2" color="rgba(56,189,248,0.22)" size={780} />
            <Orb className="right-[-10%] top-1/3" color="rgba(99,102,241,0.18)" size={520} />
            <Orb className="bottom-[-15%] left-[-5%]" color="rgba(244,184,56,0.07)" size={460} />

            {/* Exam-paper grid, fading out downward */}
            <div
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.05]"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)',
                    backgroundSize: '64px 64px',
                    maskImage: 'linear-gradient(180deg, #000 0%, transparent 78%)',
                    WebkitMaskImage: 'linear-gradient(180deg, #000 0%, transparent 78%)',
                }}
            />
            <Grain opacity={0.04} />

            <div className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-14 sm:pt-20 lg:pb-28 lg:pt-24">
                <div className="grid items-center gap-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
                    {/* ── Copy ── */}
                    <div className="text-center lg:text-left">
                        {/* Eyebrow */}
                        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-4 backdrop-blur-sm">
                            <span className="rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-950">
                                Free
                            </span>
                            <span className="text-xs font-medium tracking-wide text-slate-300">
                                {HERO.eyebrow}
                            </span>
                        </div>

                        {/* ONE static H1 — this is what Google scores. */}
                        <h1
                            id="hero-heading"
                            className="text-balance text-[2.6rem] font-extrabold leading-[1.04] tracking-[-0.035em] text-white sm:text-6xl lg:text-[4rem]"
                        >
                            Free online{' '}
                            <span className="relative whitespace-nowrap">
                                <span className="bg-gradient-to-br from-sky-200 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                                    test maker
                                </span>
                                {/* Hand-drawn underline — draws the eye to the keyword */}
                                <svg
                                    aria-hidden="true"
                                    viewBox="0 0 300 12"
                                    preserveAspectRatio="none"
                                    className="absolute -bottom-1 left-0 h-2.5 w-full text-sky-400/50"
                                >
                                    <path
                                        d="M2 8c60-5 120-6 180-3s80 4 116 1"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </span>{' '}
                            for teachers
                        </h1>

                        {/* Rotating text lives here, not in the H1. Fixed height = no CLS. */}
                        <p className="mt-6 flex h-7 items-center justify-center gap-2 text-[15px] font-medium text-slate-400 lg:justify-start">
                            <span>{HERO.rotatingPrefix}</span>
                            <span
                                className="inline-block font-semibold text-amber-300"
                                style={{
                                    opacity: visible ? 1 : 0,
                                    transform: visible ? 'translateY(0)' : 'translateY(-6px)',
                                    transition: 'opacity .28s ease, transform .28s ease',
                                }}
                            >
                                {HERO.rotating[wordIndex]}
                            </span>
                        </p>

                        {/* The subheadline the live site is missing entirely. */}
                        <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-[1.7] text-slate-300/90 sm:text-[17px] lg:mx-0">
                            {HERO.sub}
                        </p>

                        {/* One dominant CTA, one quiet secondary. */}
                        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                            <a
                                href={HERO.primaryCta.href}
                                className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-sky-400 to-sky-600 px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_10px_30px_-8px_rgba(2,132,199,0.7)] transition-transform duration-200 motion-safe:hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 sm:w-auto"
                            >
                                {/* Sheen sweep on hover */}
                                <span
                                    aria-hidden="true"
                                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                                />
                                <span className="relative">{HERO.primaryCta.label}</span>
                                <ArrowRight className="relative h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                            </a>
                            <a
                                href={HERO.secondaryCta.href}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-7 py-3.5 text-[15px] font-semibold text-slate-100 backdrop-blur-sm transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 sm:w-auto"
                            >
                                <PlayCircle className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                {HERO.secondaryCta.label}
                            </a>
                        </div>

                        {/* Trust row — replaces a generic one-liner with scannable proof */}
                        <ul className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-2.5 lg:justify-start">
                            {TRUST.map((t) => (
                                <li key={t.label} className="flex items-center gap-2 text-[13px] text-slate-400">
                                    <t.icon className="h-3.5 w-3.5 text-sky-400/80" aria-hidden="true" />
                                    {t.label}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* ── Visual ── */}
                    <div className="relative">
                        {/* Halo behind the mock so it separates from the background */}
                        <div
                            aria-hidden="true"
                            className="absolute -inset-10 rounded-[3rem] opacity-70 blur-3xl"
                            style={{ background: 'radial-gradient(circle at 55% 45%, rgba(56,189,248,.30), transparent 68%)' }}
                        />
                        <div className="relative motion-safe:animate-[heroFloat_7s_ease-in-out_infinite]">
                            <ExamMock />
                        </div>
                    </div>
                </div>
            </div>

            {/* Fade into the next section — kills the hard seam */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-24 bg-gradient-to-b from-transparent to-white dark:to-slate-950"
            />

            <style>{`
                @keyframes heroFloat {
                    0%, 100% { transform: translateY(0) }
                    50%      { transform: translateY(-10px) }
                }
                @media (prefers-reduced-motion: reduce) {
                    .motion-safe\\:animate-\\[heroFloat_7s_ease-in-out_infinite\\] { animation: none !important }
                }
            `}</style>
        </section>
    );
}
