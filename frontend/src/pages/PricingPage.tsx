import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/SEO';
import PaymentButton from '@/components/PaymentButton';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { analytics } from '@/lib/analytics/tracker';
import { cn } from '@/lib/utils';
import {
    AFTER,
    BILL_LINES,
    CLOSING,
    FEATURE_GROUPS,
    FOUNDER,
    FREE_UNTIL_ISO,
    FREE_UNTIL_LABEL,
    FREE_UNTIL_STAMP,
    HERO,
    LAUNCH_FAQS,
    REGULAR_FAQS,
    billDate,
    daysLeftLabel,
    isLaunchOn,
    type Faq,
} from './pricing/pricingContent';
import './pricing/pricing.css';

interface Plan {
    id: string;
    name: string;
    description?: string;
    price: number; // paise
    duration_days: number;
    features: string[];
    is_active: boolean;
}

/** Shown until /pricing/plans answers (same ids and prices as the plans table). */
const FALLBACK_PLANS: Plan[] = [
    {
        id: '235d651d-90d5-445a-b960-ddf82460f40e',
        name: 'Weekly Lite',
        price: 4900,
        duration_days: 7,
        features: ['Institute name and logo', 'Exam security rules', 'Scheduled exams', 'Results and Excel export'],
        is_active: true,
    },
    {
        id: '8bb5ca89-cc2a-4278-bd54-727caba1ca15',
        name: 'Monthly Pro',
        price: 14900,
        duration_days: 30,
        features: ['Institute name and logo', 'Exam security rules', 'Scheduled exams', 'Results and Excel export'],
        is_active: true,
    },
    {
        id: 'c97026b6-8c9a-4546-8514-ffe28e4e8ca8',
        name: 'Yearly Elite',
        price: 79900,
        duration_days: 365,
        features: ['Institute name and logo', 'Exam security rules', 'Scheduled exams', 'Results and Excel export'],
        is_active: true,
    },
];

const LAUNCH_SCHEMAS = (faqs: Faq[]) => [
    {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
    },
    {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'TestoZa',
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web browser',
        url: 'https://testoza.com/',
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'INR',
            priceValidUntil: FREE_UNTIL_ISO.slice(0, 10),
            availability: 'https://schema.org/InStock',
            description: `Every feature free for every educator until ${FREE_UNTIL_LABEL}.`,
        },
    },
];

const rupees = (paise: number, withPaise = false) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: withPaise ? 2 : 0,
        maximumFractionDigits: withPaise ? 2 : 0,
    }).format(paise / 100);

const period = (days: number) => (days >= 365 ? 'year' : days >= 28 ? 'month' : days >= 7 ? 'week' : 'day');

/** "Weekly lite" → "Weekly Lite" (plan names come from the admin's plans table). */
const titleCase = (s: string) => s.replace(/\b\p{Ll}/gu, (c) => c.toUpperCase());

function usePlans(): Plan[] {
    const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
    useEffect(() => {
        let alive = true;
        import('@/lib/pricingApi')
            .then(({ fetchPlans }) => fetchPlans())
            .then(({ data }) => {
                if (!alive || !Array.isArray(data)) return;
                const active = (data as Plan[]).filter((p) => p.is_active);
                if (active.length) setPlans([...active].sort((a, b) => a.duration_days - b.duration_days));
            })
            .catch(() => undefined);
        return () => {
            alive = false;
        };
    }, []);
    return plans;
}

/** Re-renders every minute so the countdown and the bill's date never go stale on an open tab. */
function useNow(): Date {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const t = window.setInterval(() => setNow(new Date()), 60_000);
        return () => window.clearInterval(t);
    }, []);
    return now;
}

export default function PricingPage() {
    const now = useNow();
    const plans = usePlans();
    return isLaunchOn(now) ? <LaunchPricing now={now} plans={plans} /> : <RegularPricing plans={plans} />;
}

/* ═══════════════════════════ Launch offer ═══════════════════════════ */

function LaunchPricing({ now, plans }: { now: Date; plans: Plan[] }) {
    const yearly = plans.find((p) => p.duration_days >= 365);
    const left = daysLeftLabel(now);

    return (
        <div className="pz">
            <SEO
                title="Pricing: everything free until 31 December 2026 | TestoZa"
                description="Every TestoZa feature is free for every educator until 31 December 2026: AI import from PDFs, live exams with anti-cheat rules and instant results. No card."
                canonicalUrl="https://testoza.com/pricing"
                schemas={LAUNCH_SCHEMAS(LAUNCH_FAQS)}
            />

            {/* ── Hero ── */}
            <header className="pz-hero">
                <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.12fr_0.88fr] lg:gap-10 lg:pb-24 lg:pt-20">
                    <div>
                        <p className="pz-pill">
                            <span className="pz-dot" aria-hidden="true" />
                            Launch offer · {left}
                        </p>

                        <h1 className="pz-display pz-h1 mt-6">
                            {HERO.titleLead}{' '}
                            <span className="pz-mark">{HERO.titleDate}</span>.
                        </h1>

                        <p className="pz-lede mt-5 max-w-xl">{HERO.lede}</p>

                        <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
                            <Link
                                to="/create-test"
                                className="pz-btn"
                                onClick={() => analytics.track('pricing_cta', { where: 'hero' })}
                            >
                                {HERO.primary}
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                            <a href="#after" className="pz-link">
                                {HERO.secondary}
                                <ArrowDown className="h-4 w-4" aria-hidden="true" />
                            </a>
                        </div>

                        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5">
                            {HERO.promises.map((p) => (
                                <li key={p} className="pz-ink-2 flex items-center gap-2 text-[14px]">
                                    <PenTick />
                                    {p}
                                </li>
                            ))}
                        </ul>

                        <p className="pz-muted mt-6 max-w-xl text-[13.5px] leading-relaxed">{HERO.proof}</p>
                    </div>

                    <div className="flex justify-center lg:justify-end lg:pr-4">
                        <Bill now={now} yearly={yearly} left={left} />
                    </div>
                </div>
            </header>

            {/* ── What's included ── */}
            <section id="included" className="pz-section">
                <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
                    <div className="max-w-2xl">
                        <p className="pz-eyebrow">What’s included</p>
                        <h2 className="pz-display pz-h2 mt-3">All of it. No plan to pick.</h2>
                        <p className="pz-ink-2 mt-3 text-[16px] leading-relaxed">
                            Until {FREE_UNTIL_LABEL}, every account gets every feature, including the ones the paid
                            plans are for. These are the parts educators use most.
                        </p>
                    </div>

                    <div className="mt-12 grid gap-x-14 gap-y-14 md:grid-cols-2">
                        {FEATURE_GROUPS.map((g, i) => (
                            <div key={g.key}>
                                <div className="flex items-baseline gap-3">
                                    <span className="pz-num">{String(i + 1).padStart(2, '0')}</span>
                                    <h3 className="pz-display pz-h3">{g.title}</h3>
                                </div>
                                <p className="pz-muted mt-1.5 pl-[30px] text-[14.5px]">{g.note}</p>
                                <ul className="pz-list">
                                    {g.items.map((f) => (
                                        <li key={f.title}>
                                            <PenTick />
                                            <span>
                                                <span className="pz-item-title">{f.title}</span>
                                                <span className="pz-item-text">{f.text}</span>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── After December ── */}
            <section id="after" className="pz-section pz-tint">
                <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
                    <div>
                        <p className="pz-eyebrow">{AFTER.eyebrow}</p>
                        <h2 className="pz-display pz-h2 mt-3">{AFTER.title}</h2>
                        <p className="pz-ink-2 mt-3 text-[16px]">{AFTER.lede}</p>

                        <ol className="pz-steps">
                            {AFTER.steps.map((s, i) => (
                                <li key={s.title} className={cn('pz-step', i === 0 && 'pz-step-now')}>
                                    <span className="pz-step-dot" aria-hidden="true" />
                                    <p className="pz-step-when">{s.when}</p>
                                    <p className="pz-step-title">{s.title}</p>
                                    <p className="pz-step-text">{s.text}</p>
                                </li>
                            ))}
                        </ol>
                    </div>

                    <aside className="pz-card self-start p-6 sm:p-7" aria-labelledby="pz-prices-title">
                        <h3 id="pz-prices-title" className="pz-display text-[18px] font-semibold">
                            {AFTER.priceCardTitle}
                        </h3>
                        <p className="pz-muted mt-1 text-[14px] leading-relaxed">{AFTER.priceCardNote}</p>
                        <ul className="mt-4">
                            {plans.map((p) => (
                                <li key={p.id} className="pz-price-row">
                                    <div>
                                        <p className="text-[15px] font-semibold">{titleCase(p.name)}</p>
                                        <p className="pz-muted text-[13.5px]">
                                            <span className="pz-strike">{rupees(p.price)}</span> a {period(p.duration_days)}
                                        </p>
                                    </div>
                                    <p className="text-right">
                                        <span className="pz-zero">₹0</span>
                                        <span className="pz-muted block text-[12px]">till 31 Dec</span>
                                    </p>
                                </li>
                            ))}
                        </ul>
                        <p className="pz-muted mt-4 border-t pt-4 text-[13px] leading-relaxed" style={{ borderColor: 'var(--pz-line)' }}>
                            {AFTER.priceCardFoot}
                        </p>
                    </aside>
                </div>
            </section>

            {/* ── Founder's note ── */}
            <section className="pz-section">
                <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
                    <article className="pz-letter">
                        <p className="pz-eyebrow">{FOUNDER.eyebrow}</p>
                        <div className="pz-letter-body mt-4">
                            {FOUNDER.paragraphs.map((p) => (
                                <p key={p.slice(0, 24)}>{p}</p>
                            ))}
                        </div>
                        <div
                            className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t pt-6"
                            style={{ borderColor: 'var(--pz-line)' }}
                        >
                            <div className="flex items-center gap-3">
                                <span className="pz-avatar" aria-hidden="true">
                                    {FOUNDER.initials}
                                </span>
                                <span>
                                    <span className="block text-[15px] font-semibold">{FOUNDER.name}</span>
                                    <span className="pz-muted block text-[13.5px]">{FOUNDER.role}</span>
                                </span>
                            </div>
                            <Link to="/help" className="pz-link text-[14.5px]">
                                {FOUNDER.link}
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                        </div>
                    </article>
                </div>
            </section>

            <FaqSection faqs={LAUNCH_FAQS} tinted />

            {/* ── Closing ── */}
            <section className="pz-close">
                <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 sm:py-16 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="pz-display text-[1.6rem] font-semibold leading-tight sm:text-[1.85rem]">{CLOSING.title}</h2>
                        <p className="pz-close-sub mt-2 text-[15px]">
                            Free until {FREE_UNTIL_LABEL}. {left}.
                        </p>
                    </div>
                    <Link
                        to="/create-test"
                        className="pz-btn shrink-0"
                        onClick={() => analytics.track('pricing_cta', { where: 'closing' })}
                    >
                        {CLOSING.button}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                </div>
            </section>
        </div>
    );
}

/** A tick drawn with a red pen, slightly uneven like a real one. */
function PenTick() {
    return (
        <svg className="pz-tick" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
                d="M3.6 10.9c1.3.9 2.5 2.2 3.5 3.8.3.5.9.5 1.2 0 2-3.9 4.6-7.4 8.3-10.4"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/** Bar widths for the bill's barcode (decorative). */
const BARS = [2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1, 2, 1, 3, 2, 1, 2, 1, 1];

function Bill({ now, yearly, left }: { now: Date; yearly?: Plan; left: string }) {
    return (
        <figure
            className="pz-bill-wrap"
            aria-label={`Example bill for one educator: ${BILL_LINES.join(', ')}. To pay: zero rupees until ${FREE_UNTIL_LABEL}.`}
        >
            {/* Roughens the stamp's edges so it reads as ink, not a CSS box. */}
            <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
                <filter id="pz-ink">
                    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
                </filter>
            </svg>

            <div className="pz-bill" aria-hidden="true">
                <div className="text-center">
                    <p className="pz-bill-brand">TestoZa</p>
                    <p className="pz-bill-faint mt-1 text-[11.5px]">testoza.com · online exams</p>
                </div>

                <hr className="pz-bill-dash" />

                <div className="pz-bill-row">
                    <span>Bill for</span>
                    <span>One educator</span>
                </div>
                <div className="pz-bill-row">
                    <span>Date</span>
                    <span>{billDate(now)}</span>
                </div>

                <hr className="pz-bill-dash" />

                <ul className="space-y-0.5">
                    {BILL_LINES.map((l) => (
                        <li key={l} className="pz-bill-row">
                            <span>{l}</span>
                            <span className="pz-bill-faint">incl.</span>
                        </li>
                    ))}
                </ul>

                <hr className="pz-bill-dash" />

                {yearly && (
                    <>
                        <div className="pz-bill-row">
                            <span>Usual price, 1 year</span>
                            <span>{rupees(yearly.price, true)}</span>
                        </div>
                        <div className="pz-bill-row">
                            <span>Free till 31 Dec</span>
                            <span>−{rupees(yearly.price, true)}</span>
                        </div>
                    </>
                )}

                <hr className="pz-bill-double" />

                <div className="pz-bill-row pz-bill-total">
                    <span>TO PAY</span>
                    <span>₹0.00</span>
                </div>

                {/* The stamp gets its own blank space, so it never covers the total. */}
                <div className="pz-stamp-zone">
                    <div className="pz-stamp">
                        <b>FREE</b>
                        <small>till {FREE_UNTIL_STAMP}</small>
                    </div>
                </div>

                <hr className="pz-bill-dash" />

                <p className="text-center leading-relaxed">
                    {left} at this price
                    <br />
                    <span className="pz-bill-faint">Thank you for teaching.</span>
                </p>

                <div className="pz-bill-bars">
                    {BARS.map((w, i) => (
                        <span key={i} style={{ width: w }} />
                    ))}
                </div>
            </div>
        </figure>
    );
}

function FaqSection({ faqs, tinted = false }: { faqs: Faq[]; tinted?: boolean }) {
    return (
        <section id="faq" className={cn('pz-section', tinted && 'pz-tint')}>
            <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
                <div>
                    <p className="pz-eyebrow">Questions</p>
                    <h2 className="pz-display pz-h2 mt-3">Before you start</h2>
                    <p className="pz-ink-2 mt-3 text-[15.5px] leading-relaxed">
                        Something else on your mind?{' '}
                        <Link to="/help" className="pz-link text-[15.5px]">
                            Ask in Help
                        </Link>
                        .
                    </p>
                </div>
                <div className="pz-faq">
                    {faqs.map((f) => (
                        <details key={f.q}>
                            <summary>
                                <span>{f.q}</span>
                                <Plus className="pz-faq-icon" aria-hidden="true" />
                            </summary>
                            <p className="pz-faq-answer">{f.a}</p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ═════════════════════ After the launch offer ends ═════════════════════ */

function RegularPricing({ plans }: { plans: Plan[] }) {
    const { isPremium, planId, expiryDate } = usePremiumStatus();
    const popularId = plans.find((p) => p.duration_days >= 28 && p.duration_days < 365)?.id;

    return (
        <div className="pz">
            <SEO
                title="Pricing and plans | TestoZa"
                description="TestoZa plans for educators and institutes: pay for a week, a month or a year with UPI, cards or net banking. Nothing renews by itself."
                canonicalUrl="https://testoza.com/pricing"
                schemas={[LAUNCH_SCHEMAS(REGULAR_FAQS)[0]]}
            />

            <header className="pz-hero">
                <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pt-16 lg:pb-16 lg:pt-20">
                    <p className="pz-eyebrow">Pricing</p>
                    <h1 className="pz-display pz-h1 mt-4 max-w-3xl">Pay for the weeks you run exams.</h1>
                    <p className="pz-lede mt-5 max-w-2xl">
                        Pick a week, a month or a year. Pay once with UPI, a card or net banking. Nothing renews by
                        itself, and your tests and results stay yours when a plan ends.
                    </p>
                </div>
            </header>

            <section className="pz-section">
                <div className="mx-auto grid max-w-6xl gap-5 px-4 py-14 sm:px-6 md:grid-cols-3">
                    {plans.map((p) => (
                        <PlanCard
                            key={p.id}
                            plan={p}
                            highlighted={p.id === popularId}
                            current={isPremium && planId === p.id}
                            expired={!isPremium && planId === p.id}
                            expiry={isPremium && planId === p.id ? expiryDate : null}
                        />
                    ))}
                </div>
            </section>

            <FaqSection faqs={REGULAR_FAQS} tinted />
        </div>
    );
}

function PlanCard({
    plan,
    highlighted,
    current,
    expired,
    expiry,
}: {
    plan: Plan;
    highlighted: boolean;
    current: boolean;
    expired: boolean;
    expiry: string | null;
}) {
    const [showCode, setShowCode] = useState(false);
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [promo, setPromo] = useState<{ code: string; discount: number; finalPrice: number } | null>(null);

    const applyCode = async () => {
        if (!code.trim()) return;
        setBusy(true);
        try {
            const { applyPromo } = await import('@/lib/pricingApi');
            const { data, error } = await applyPromo(code.trim(), plan.id);
            if (error) throw new Error(error.response?.data?.detail || error.message || 'That code didn’t work');
            setPromo({ code: data.code, discount: data.discount, finalPrice: data.finalPrice });
            toast.success(`Code applied. You save ${rupees(data.discount)}.`);
        } catch (e: any) {
            setPromo(null);
            toast.error(e?.message || 'That code didn’t work');
        } finally {
            setBusy(false);
        }
    };

    const price = promo ? promo.finalPrice : plan.price;

    return (
        <div
            className={cn('pz-card flex flex-col p-6', highlighted && !current && 'ring-1')}
            style={highlighted && !current ? { borderColor: 'var(--pz-sky)', boxShadow: '0 0 0 1px var(--pz-sky)' } : undefined}
        >
            <div className="flex items-center justify-between gap-3">
                <h2 className="pz-display text-[18px] font-semibold">{titleCase(plan.name)}</h2>
                {current && <span className="pz-pill text-[12px]">Your plan</span>}
                {!current && highlighted && <span className="pz-muted text-[12.5px] font-medium">Most chosen</span>}
            </div>
            {plan.description && <p className="pz-muted mt-1 text-[14px]">{plan.description}</p>}

            <p className="mt-5 flex items-baseline gap-1.5">
                {promo && <span className="pz-strike mr-1 text-[15px]">{rupees(plan.price)}</span>}
                <span className="pz-plan-price">{rupees(price)}</span>
                <span className="pz-muted text-[14px]">a {period(plan.duration_days)}</span>
            </p>
            {current && expiry && (
                <p className="pz-muted mt-2 text-[13px]">
                    Active until {new Date(expiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
            )}

            <ul className="pz-list mt-5 flex-1">
                {plan.features.map((f) => (
                    <li key={f} className="!py-2.5">
                        <PenTick />
                        <span className="text-[14.5px]">{f}</span>
                    </li>
                ))}
            </ul>

            {!current && (
                <div className="mt-5">
                    {showCode && !promo && (
                        <div className="mb-3 flex gap-2">
                            <input
                                className="pz-input"
                                placeholder="Code"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && applyCode()}
                                aria-label="Promo code"
                            />
                            <button type="button" className="pz-link shrink-0 px-2 text-[14px]" onClick={applyCode} disabled={busy}>
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                            </button>
                        </div>
                    )}
                    <PaymentButton
                        planId={plan.id}
                        amount={price}
                        promoCode={promo?.code}
                        className="pz-btn w-full !h-11 !rounded-[10px]"
                        onSuccess={() => window.location.reload()}
                    >
                        {expired ? 'Renew' : `Pay ${rupees(price)}`}
                    </PaymentButton>
                    {!showCode && !promo && (
                        <button type="button" className="pz-muted mt-3 text-[13px] underline-offset-4 hover:underline" onClick={() => setShowCode(true)}>
                            Have a code?
                        </button>
                    )}
                    {promo && (
                        <p className="pz-muted mt-3 text-[13px]">
                            Code {promo.code} applied.{' '}
                            <button type="button" className="underline underline-offset-4" onClick={() => { setPromo(null); setCode(''); }}>
                                Remove
                            </button>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
