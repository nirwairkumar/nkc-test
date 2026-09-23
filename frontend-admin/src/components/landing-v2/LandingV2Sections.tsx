/**
 * Landing V2 — body sections, ordered per LANDING_PAGE_AUDIT.md Part 4:
 * proof early, outcomes before features, features as supporting evidence.
 *
 * The live page runs six consecutive 600–1100px showcases before any proof at
 * ~6,000px down. Here proof sits directly under the hero and the showcases are
 * trimmed to three, alternating sides.
 */

import {
    ArrowRight, BarChart3, CheckCircle2, ShieldCheck, Sparkles,
} from 'lucide-react';
import {
    CAPABILITY_PROOF, FEATURES, PROOF_MODE, REAL_METRICS, STEPS, VALUE_PROPS,
} from './content';
import { Divider, IconTile, Pill, Reveal, Section, SectionHeading, Surface } from './ui';

export { SectionHeading } from './ui';

/* ── 2. Proof band (audit C4) ───────────────────────────────────────────── */

export function ProofBand() {
    const items =
        PROOF_MODE === 'metrics'
            ? [
                  { stat: REAL_METRICS.tests.toLocaleString(), label: 'Tests created' },
                  { stat: REAL_METRICS.educators.toLocaleString(), label: 'Educators publishing' },
                  { stat: REAL_METRICS.attemptsGraded.toLocaleString(), label: 'Attempts graded' },
                  { stat: REAL_METRICS.categories.toLocaleString(), label: 'Subject categories' },
              ]
            : CAPABILITY_PROOF.map((c) => ({ stat: c.stat, label: c.label }));

    return (
        <section aria-label="Why teachers choose TestoZa" className="relative bg-white dark:bg-slate-950">
            <div className="mx-auto max-w-7xl px-6">
                {/* Pulled up so it overlaps the hero seam — reads as one composition */}
                <Surface className="-mt-10 px-2 py-2 backdrop-blur-xl sm:-mt-14">
                    <dl className="grid grid-cols-2 divide-y divide-slate-200/70 sm:divide-y-0 lg:grid-cols-4 lg:divide-x dark:divide-white/[0.06]">
                        {items.map((it, i) => (
                            <div
                                key={it.label}
                                className={`px-6 py-7 text-center ${i % 2 === 1 ? 'border-l border-slate-200/70 dark:border-white/[0.06] lg:border-l-0' : ''}`}
                            >
                                <dt className="sr-only">{it.label}</dt>
                                <dd>
                                    <span className="block bg-gradient-to-b from-slate-900 to-slate-600 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent dark:from-white dark:to-slate-400 sm:text-[1.75rem]">
                                        {it.stat}
                                    </span>
                                    <span className="mt-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                                        {it.label}
                                    </span>
                                </dd>
                            </div>
                        ))}
                    </dl>
                </Surface>
            </div>
        </section>
    );
}

/* ── 3. Value props (audit M2) ──────────────────────────────────────────── */

const ICONS = { sparkles: Sparkles, shield: ShieldCheck, chart: BarChart3 } as const;
const TONES = ['sky', 'violet', 'amber'] as const;

export function ValueProps() {
    return (
        <Section id="features" tone="muted">
            <div className="mx-auto max-w-7xl px-6">
                <SectionHeading
                    kicker="Why TestoZa"
                    title="Everything a real exam needs, nothing it doesn't"
                    sub="Three things separate an assessment platform from a form builder. TestoZa does all three."
                />

                <div className="mt-16 grid gap-6 md:grid-cols-3">
                    {VALUE_PROPS.map((v, i) => {
                        const Icon = ICONS[v.icon as keyof typeof ICONS];
                        return (
                            <Reveal key={v.title} delay={i * 90}>
                                <Surface as="article" lift glow className="flex h-full flex-col p-7">
                                    <IconTile tone={TONES[i % TONES.length]}>
                                        <Icon className="h-5 w-5" aria-hidden="true" />
                                    </IconTile>

                                    <h3 className="mt-6 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                                        {v.title}
                                    </h3>
                                    <p className="mt-3 flex-1 text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                                        {v.body}
                                    </p>

                                    {/* Internal links to the orphaned keyword pages (audit C3) */}
                                    <a
                                        href={v.href}
                                        className="group/link mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 transition-colors hover:text-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 dark:text-sky-400"
                                    >
                                        {v.linkLabel}
                                        <ArrowRight
                                            className="h-3.5 w-3.5 transition-transform duration-200 group-hover/link:translate-x-1"
                                            aria-hidden="true"
                                        />
                                    </a>
                                </Surface>
                            </Reveal>
                        );
                    })}
                </div>
            </div>
        </Section>
    );
}

/* ── 4. How it works ────────────────────────────────────────────────────── */

export function HowItWorks() {
    return (
        <Section id="how-it-works">
            <div className="mx-auto max-w-7xl px-6">
                <SectionHeading
                    kicker="How it works"
                    title="A finished paper in three steps"
                    sub="No setup, no training, no template library to wade through."
                />

                <ol className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
                    {/* Single continuous rail behind all three steps */}
                    <span
                        aria-hidden="true"
                        className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-white/15 md:block"
                    />

                    {STEPS.map((s, i) => (
                        <Reveal key={s.n} delay={i * 110}>
                            <li className="relative text-center">
                                <span className="relative z-[1] mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-slate-800 to-slate-950 font-mono text-sm font-bold text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_10px_24px_-10px_rgba(15,23,42,0.6)] ring-1 ring-white/10 dark:from-sky-500 dark:to-sky-700 dark:shadow-[0_10px_24px_-10px_rgba(2,132,199,0.8)]">
                                    {s.n}
                                </span>
                                <h3 className="mt-6 text-base font-bold tracking-tight text-slate-900 dark:text-white">
                                    {s.title}
                                </h3>
                                <p className="mx-auto mt-2.5 max-w-xs text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                                    {s.body}
                                </p>
                            </li>
                        </Reveal>
                    ))}
                </ol>
            </div>
        </Section>
    );
}

/* ── 5. Feature deep-dives, alternating (audit Part 4) ───────────────────── */

function FeatureVisual({ kind }: { kind: string }) {
    if (kind === 'question') {
        return (
            <Surface className="p-6" >
                <div className="mb-4 flex items-center justify-between">
                    <Pill tone="neutral">Marking scheme</Pill>
                    <span className="font-mono text-[11px] text-slate-400">4 types</span>
                </div>
                <div className="space-y-2.5" style={{ minHeight: 236 }}>
                    {([
                        ['Single correct', '+4 / −1', 'sky'],
                        ['Multiple correct', '+4 / partial', 'violet'],
                        ['Numerical range', '+4 / 0', 'emerald'],
                        ['Assertion–reason', '+3 / −1', 'amber'],
                    ] as const).map(([label, marks, tone]) => (
                        <div
                            key={label}
                            className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-200/70 dark:bg-white/[0.03] dark:ring-white/[0.06]"
                        >
                            <Pill tone={tone}>{label}</Pill>
                            <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {marks}
                            </span>
                        </div>
                    ))}
                </div>
            </Surface>
        );
    }

    if (kind === 'exam') {
        return (
            <Surface className="p-6">
                <div className="mb-4 flex items-center justify-between">
                    <Pill tone="emerald">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                        Exam in progress
                    </Pill>
                    <span className="font-mono text-[11px] tabular-nums text-slate-400">28:14</span>
                </div>
                <div className="space-y-2.5" style={{ minHeight: 236 }}>
                    {([
                        ['Full-screen enforced', true],
                        ['Tab switches blocked', true],
                        ['Copy / paste disabled', true],
                        ['Questions randomised', true],
                        ['Violations logged', true],
                    ] as const).map(([label, ok]) => (
                        <div
                            key={label}
                            className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5 ring-1 ring-inset ring-slate-200/70 dark:bg-white/[0.03] dark:ring-white/[0.06]"
                        >
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            </span>
                            <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{label}</span>
                        </div>
                    ))}
                </div>
            </Surface>
        );
    }

    return (
        <Surface className="p-6">
            <div className="mb-5 flex items-center justify-between">
                <Pill tone="neutral">Topic performance</Pill>
                <span className="font-mono text-[11px] text-slate-400">42 students</span>
            </div>
            <div className="space-y-4" style={{ minHeight: 236 }}>
                {([
                    ['Mechanics', 82], ['Thermodynamics', 64], ['Optics', 91], ['Modern physics', 47],
                ] as const).map(([topic, pct]) => (
                    <div key={topic}>
                        <div className="mb-1.5 flex items-baseline justify-between">
                            <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{topic}</span>
                            <span className="font-mono text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                                {pct}%
                            </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                            <div
                                className={`h-full rounded-full ${
                                    pct >= 70 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                    : pct >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                    : 'bg-gradient-to-r from-rose-400 to-rose-500'
                                }`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </Surface>
    );
}

export function FeatureDeepDives() {
    return (
        <Section tone="muted">
            <div className="mx-auto max-w-7xl space-y-24 px-6 sm:space-y-32">
                {FEATURES.map((f, i) => (
                    <Reveal key={f.title}>
                        <div
                            className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-20 ${
                                i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
                            }`}
                        >
                            <div>
                                <Pill tone={i % 2 === 0 ? 'sky' : 'violet'}>{f.kicker}</Pill>
                                <h3 className="mt-5 text-balance text-2xl font-bold tracking-[-0.02em] text-slate-900 dark:text-white sm:text-[2rem] sm:leading-[1.15]">
                                    {f.title}
                                </h3>
                                <p className="mt-4 text-pretty text-base leading-[1.7] text-slate-600 dark:text-slate-400">
                                    {f.body}
                                </p>
                                <ul className="mt-7 space-y-3">
                                    {f.bullets.map((b) => (
                                        <li key={b} className="flex items-start gap-3">
                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
                                                <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                                            </span>
                                            <span className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{b}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <FeatureVisual kind={f.visual} />
                        </div>
                    </Reveal>
                ))}
            </div>
            <div className="mt-24"><Divider /></div>
        </Section>
    );
}
