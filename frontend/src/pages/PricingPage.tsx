import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Package, Settings, Sparkles, Zap, Star, ChevronDown, HelpCircle } from 'lucide-react';
import PaymentButton from '@/components/PaymentButton';
import { useAuth } from '@/contexts/AuthContext';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { toast } from 'sonner';

interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    duration_days: number;
    features: string[];
    is_active: boolean;
}

const DEFAULT_PLANS: Plan[] = [
    {
        id: '235d651d-90d5-445a-b960-ddf82460f40e',
        name: 'Weekly Lite',
        description: 'Perfect for occasional tests and weekly assessments',
        price: 4900,
        duration_days: 7,
        features: [
            'Institute Name & Logo Branding',
            'Advanced Exam Security Controls',
            'View & Export Submitted Results',
            '100 Student Result Submissions',
            'Scheduled Online Exams',
            'Student Management & Batches'
        ],
        is_active: true
    },
    {
        id: '8bb5ca89-cc2a-4278-bd54-727caba1ca15',
        name: 'Monthly Pro',
        description: 'Best for active classrooms and coaching batches',
        price: 14900,
        duration_days: 30,
        features: [
            'Institute Name & Logo Branding',
            'Advanced Anti-Cheat Exam Mode',
            'Detailed Score Analytics & Rank Reports',
            '350 Student Result Submissions',
            'Timed Exam Scheduling',
            'Student Batch Management',
            'Priority Support'
        ],
        is_active: true
    },
    {
        id: 'c97026b6-8c9a-4546-8514-ffe28e4e8ca8',
        name: 'Yearly Elite',
        description: 'Maximum value for schools and coaching institutes',
        price: 79900,
        duration_days: 365,
        features: [
            'White-Label Institute Branding',
            'Full Anti-Cheat Proctoring Suite',
            'Comprehensive Student Analytics',
            '4,000 Student Result Submissions',
            'Unlimited Exam Scheduling',
            'Custom Domain & Certificate Ready',
            'Priority Support 24/7'
        ],
        is_active: true
    }
];

const PRICING_FAQS = [
    {
        q: "Is TestoZa really free? What's the catch?",
        a: "Yes, TestoZa is 100% free for individual teachers and educators creating and conducting standard online tests. There is no trial period, no credit card requirement, and no artificial cap on the number of tests you can create or students you can assess. Our paid plans are strictly for coaching institutes and schools needing white-label branding, higher submission quotas, and dedicated organizational support."
    },
    {
        q: "How many students can take a test at once?",
        a: "Hundreds of students can take a test simultaneously on TestoZa without lag or server degradation. Our infrastructure is powered by Google Cloud Run and Cloudflare edge networks, which scale dynamically to handle concurrent exam traffic during institute-wide tests, coaching mock exams, and school assessments."
    },
    {
        q: "What happens if a student's internet disconnects mid-test?",
        a: "If a student loses their internet connection during an exam, TestoZa saves all answered questions locally in the browser. When the connection is restored, responses sync automatically with our server. If the connection cannot be restored before the timer ends, submitted answers up to the point of disconnection remain safely recorded and accessible in the educator's dashboard."
    },
    {
        q: "Do students need to create an account to take a test?",
        a: "No, students do not need to create an account or sign up to take a test. They simply open the test link provided by the teacher, enter their name, roll number, or email address as required by your settings, and begin the assessment immediately. This eliminates login friction and technical barriers on exam day."
    },
    {
        q: "Is my question paper data secure?",
        a: "Yes, your question papers, uploaded study materials, and student response data are completely secure and private. All data is encrypted in transit using SSL/TLS and stored on secure cloud databases with strict access controls. TestoZa never shares, sells, or publicly publishes tests created privately by educators or coaching institutes."
    },
    {
        q: "What payment methods do you support for premium plans?",
        a: "We support all major Indian and international payment methods through our secure Razorpay gateway. You can pay using UPI (Google Pay, PhonePe, Paytm), credit and debit cards (Visa, MasterCard, RuPay), net banking across all major banks, and digital wallets. Invoices with GST details are automatically generated upon payment."
    },
    {
        q: "Can I upgrade, renew, or cancel my subscription anytime?",
        a: "Yes, you have complete control over your subscription with no lock-in contracts. Since our plans are flexible (weekly, monthly, or yearly), you can renew when exam seasons begin or switch plans as your student batch size changes. If your subscription expires, your tests and student history remain safe and accessible on the free tier."
    }
];

const pricingFAQSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": PRICING_FAQS.map(faq => ({
        "@type": "Question",
        "name": faq.q,
        "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.a
        }
    }))
};

// Empty State Component
const EmptyState = () => {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 rounded-full p-8 mb-6">
                <Package className="w-12 h-12 text-indigo-500" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">No Plans Available</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
                There are currently no pricing plans available. Please check back later or contact support.
            </p>
        </div>
    );
};

// Pricing Card Component
const PricingCard = ({
    plan,
    isCurrentPlan,
    isExpiredPlan,
    isPremium,
    formatPrice,
    isPopular,
}: {
    plan: Plan;
    isCurrentPlan: boolean;
    isExpiredPlan: boolean;
    isPremium: boolean;
    formatPrice: (p: number) => string;
    isPopular: boolean;
}) => {
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; finalPrice: number } | null>(null);
    const [promoLoading, setPromoLoading] = useState(false);

    const handleApplyPromo = async () => {
        if (!promoCode.trim()) {
            toast.error('Please enter a promo code');
            return;
        }
        setPromoLoading(true);
        try {
            const { applyPromo } = await import('@/lib/pricingApi');
            const { data, error } = await applyPromo(promoCode, plan.id);
            if (error) throw new Error(error.response?.data?.detail || error.message || 'Failed to apply promo');
            setAppliedPromo({ code: data.code, discount: data.discount, finalPrice: data.finalPrice });
            toast.success(`Promo applied! You save ${formatPrice(data.discount)}`);
        } catch (error: any) {
            console.error('Promo Error', error);
            toast.error(error.message || 'Invalid promo code');
            setAppliedPromo(null);
        } finally {
            setPromoLoading(false);
        }
    };

    const handleRemovePromo = () => {
        setAppliedPromo(null);
        setPromoCode('');
    };

    const getDurationLabel = (days: number) => {
        if (days >= 365) return 'year';
        if (days >= 28) return 'month';
        if (days >= 7) return 'week';
        return 'day';
    };
    const durationLabel = getDurationLabel(plan.duration_days);
    const isYearly = plan.duration_days >= 365;

    return (
        <div
            className={`relative flex flex-col rounded-2xl overflow-hidden border transition-all duration-300
                ${isCurrentPlan
                    ? 'border-emerald-400 shadow-[0_0_30px_-5px_rgba(16,185,129,0.25)] ring-2 ring-emerald-400/20 bg-gradient-to-b from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20'
                    : isExpiredPlan
                    ? 'border-red-300 shadow-[0_0_20px_-5px_rgba(239,68,68,0.15)] ring-2 ring-red-200/40 bg-gradient-to-b from-white to-red-50/20 dark:from-slate-900 dark:to-red-950/10'
                    : isPopular
                    ? 'border-indigo-400 shadow-xl bg-white dark:bg-slate-900'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800'
                }
            `}
        >
            {/* Popular banner */}
            {isPopular && !isCurrentPlan && !isExpiredPlan && (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 text-xs font-bold flex items-center justify-center gap-1.5 tracking-wider">
                    <Star className="w-3 h-3" /> MOST POPULAR
                </div>
            )}

            {/* Active plan banner */}
            {isCurrentPlan && (
                <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2 text-xs font-bold flex items-center justify-center gap-1.5 tracking-wider">
                    <Check className="w-3.5 h-3.5" /> CURRENT SUBSCRIPTION
                </div>
            )}

            {/* Expired plan banner */}
            {isExpiredPlan && (
                <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white py-2 text-xs font-bold flex items-center justify-center gap-1.5 tracking-wider">
                    ⚠️ SUBSCRIPTION EXPIRED — RENEW NOW
                </div>
            )}

            {/* Card Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                        <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{plan.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{plan.description}</p>
                    </div>
                    {isYearly ? (
                        <div className="shrink-0 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full p-1.5">
                            <Zap className="w-4 h-4" />
                        </div>
                    ) : (
                        <div className="shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full p-1.5">
                            <Sparkles className="w-4 h-4" />
                        </div>
                    )}
                </div>

                {/* Price */}
                {appliedPromo ? (
                    <div className="space-y-1">
                        <span className="text-sm text-slate-400 line-through">{formatPrice(plan.price)}</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">
                                {formatPrice(appliedPromo.finalPrice)}
                            </span>
                            <span className="text-sm text-slate-500 font-medium">/ {durationLabel}</span>
                        </div>
                        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs mt-1">
                            💰 Save {formatPrice(appliedPromo.discount)} with {appliedPromo.code}
                        </Badge>
                    </div>
                ) : (
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            {formatPrice(plan.price)}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            / {durationLabel}
                        </span>
                    </div>
                )}
            </div>

            {/* Card Body */}
            <div className="flex-1 p-5 sm:p-6 space-y-5">
                {/* Promo Code */}
                {!isCurrentPlan && (
                    <div className="space-y-2">
                        {!appliedPromo ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Promo code"
                                    className="flex h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-medium transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 placeholder:text-slate-400 uppercase outline-none"
                                    value={promoCode}
                                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleApplyPromo}
                                    disabled={promoLoading || !promoCode}
                                    className="px-4 text-xs font-semibold shrink-0"
                                >
                                    {promoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                                </Button>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
                                <span className="text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                                    <Check className="w-3.5 h-3.5" /> {appliedPromo.code} Applied
                                </span>
                                <button
                                    onClick={handleRemovePromo}
                                    className="text-xs text-red-500 hover:text-red-600 font-semibold hover:underline"
                                >
                                    Remove
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Features List */}
                <ul className="space-y-3">
                    {Array.isArray(plan.features) &&
                        plan.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2.5">
                                <div className="shrink-0 bg-emerald-100 dark:bg-emerald-900/30 rounded-full p-0.5 mt-0.5">
                                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{feature}</span>
                            </li>
                        ))}
                </ul>
            </div>

            {/* Card Footer */}
            <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                {isCurrentPlan ? (
                    <Button
                        className="w-full h-11 text-sm font-bold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 cursor-default shadow-sm"
                        disabled
                    >
                        ✓ Active Plan
                    </Button>
                ) : (
                    <PaymentButton
                        planId={plan.id}
                        amount={appliedPromo ? appliedPromo.finalPrice : plan.price}
                        promoCode={appliedPromo ? appliedPromo.code : undefined}
                        className={`w-full h-11 text-sm font-bold shadow-sm ${
                            isExpiredPlan
                                ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                                : isPopular
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                        }`}
                        onSuccess={() => window.location.reload()}
                    >
                        {isExpiredPlan ? '🔄 Renew Plan' : isPremium ? '🔄 Switch Plan' : '🚀 Get Started'}
                    </PaymentButton>
                )}
            </div>
        </div>
    );
};

export default function PricingPage() {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const { isPremium, planId: currentPlanId, expiryDate } = usePremiumStatus();
    const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const { fetchPlans } = await import('@/lib/pricingApi');
            const { data, error } = await fetchPlans();
            if (!error && data && data.length > 0) {
                const activePlans = data.filter((p: Plan) => p.is_active);
                if (activePlans.length > 0) {
                    setPlans(activePlans);
                }
            }
        } catch (error: any) {
            console.error('Error fetching plans:', error);
        }
    };

    const formatPrice = (paise: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(paise / 100);
    };

    // Determine the "popular" plan (yearly, or the last one if no yearly)
    const popularPlanId = plans.find(p => p.duration_days >= 365)?.id ?? plans[plans.length - 1]?.id;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <SEO
                title="Pricing & Plans for Teachers & Institutes | Free Online Test Maker | TestoZa"
                description="Affordable, transparent pricing for teachers, coaching institutes, and schools. Start 100% free with unlimited tests and students, or upgrade to Weekly, Monthly, or Yearly plans for white-label branding and advanced proctoring."
                canonicalUrl="https://testoza.com/pricing"
                schemas={[pricingFAQSchema]}
            />

            {/* Hero Header */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 pt-12 pb-20 text-center">
                <div className="max-w-3xl mx-auto">
                    <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-2">Transparent Plans & Pricing</p>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4">
                        Simple, Predictable Pricing for Educators
                    </h1>
                    <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
                        Start 100% free with unlimited test creation. Upgrade only when you need custom institute branding, anti-cheat proctoring, and official certificates.
                    </p>
                </div>
            </div>

            {/* Content Container */}
            <div className="px-4 -mt-10 pb-16 max-w-6xl mx-auto">
                {/* Free Forever Banner */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100 dark:border-indigo-950/60 p-6 sm:p-8 mb-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                            ✓ 100% Free Tier
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Free Forever for Individual Teachers
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                            Create unlimited tests, generate quizzes with AI from PDFs or YouTube, and share test links with as many students as you want. Zero credit card required.
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-xs text-slate-600 dark:text-slate-300">
                            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Unlimited Tests</span>
                            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Unlimited Students</span>
                            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> AI Question Generator</span>
                            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Instant Auto-Grading</span>
                        </div>
                    </div>
                    <div className="shrink-0">
                        <Button
                            size="lg"
                            onClick={() => navigate('/create-test')}
                            className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-bold px-8 py-6 rounded-xl"
                        >
                            Get Started Free
                        </Button>
                    </div>
                </div>

                {/* Paid Plans Title */}
                <div className="text-center mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        Premium Plans for Coaching Institutes & Schools
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Add white-label branding, secure anti-cheat controls, and detailed performance rank cards.
                    </p>
                </div>

                {/* Plan Cards */}
                <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-16">
                    {plans.map((plan) => (
                        <PricingCard
                            key={plan.id}
                            plan={plan}
                            isCurrentPlan={isPremium && currentPlanId === plan.id}
                            isExpiredPlan={!isPremium && currentPlanId === plan.id}
                            isPremium={isPremium}
                            formatPrice={formatPrice}
                            isPopular={plan.id === popularPlanId}
                        />
                    ))}
                </div>

                {/* Feature Comparison Table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 mb-16 shadow-sm overflow-x-auto">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2 text-center md:text-left">
                        Detailed Feature Comparison
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center md:text-left">
                        Compare capabilities across TestoZa's free tier and premium institution plans.
                    </p>
                    <table className="w-full text-left text-sm border-collapse min-w-[600px]">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold">
                                <th className="pb-4 pr-4">Feature</th>
                                <th className="pb-4 px-3 text-center">Free Forever</th>
                                <th className="pb-4 px-3 text-center">Weekly Lite (₹49)</th>
                                <th className="pb-4 px-3 text-center">Monthly Pro (₹149)</th>
                                <th className="pb-4 pl-3 text-center text-indigo-600 dark:text-indigo-400">Yearly Elite (₹799)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                            <tr>
                                <td className="py-3 font-medium text-slate-900 dark:text-white">Online Test Creation</td>
                                <td className="py-3 text-center text-emerald-600 font-semibold">Unlimited</td>
                                <td className="py-3 text-center text-emerald-600 font-semibold">Unlimited</td>
                                <td className="py-3 text-center text-emerald-600 font-semibold">Unlimited</td>
                                <td className="py-3 text-center text-emerald-600 font-semibold">Unlimited</td>
                            </tr>
                            <tr>
                                <td className="py-3 font-medium text-slate-900 dark:text-white">Student Test Takers</td>
                                <td className="py-3 text-center text-emerald-600 font-semibold">Unlimited</td>
                                <td className="py-3 text-center text-emerald-600 font-semibold">Unlimited</td>
                                <td className="py-3 text-center text-emerald-600 font-semibold">Unlimited</td>
                                <td className="py-3 text-center text-emerald-600 font-semibold">Unlimited</td>
                            </tr>
                            <tr>
                                <td className="py-3 font-medium text-slate-900 dark:text-white">AI Test Generation (PDF & Video)</td>
                                <td className="py-3 text-center text-emerald-600 font-semibold">Included</td>
                                <td className="py-3 text-center text-emerald-600 font-semibold">Included</td>
                                <td className="py-3 text-center text-emerald-600 font-semibold">Included</td>
                                <td className="py-3 text-center text-emerald-600 font-semibold">Included</td>
                            </tr>
                            <tr>
                                <td className="py-3 font-medium text-slate-900 dark:text-white">Submissions Quota per cycle</td>
                                <td className="py-3 text-center">Standard</td>
                                <td className="py-3 text-center font-semibold">100</td>
                                <td className="py-3 text-center font-semibold">350</td>
                                <td className="py-3 text-center font-semibold text-indigo-600 dark:text-indigo-400">4,000</td>
                            </tr>
                            <tr>
                                <td className="py-3 font-medium text-slate-900 dark:text-white">Custom Institute Logo & Name</td>
                                <td className="py-3 text-center text-slate-400">—</td>
                                <td className="py-3 text-center text-emerald-600">✓</td>
                                <td className="py-3 text-center text-emerald-600">✓</td>
                                <td className="py-3 text-center text-emerald-600">✓</td>
                            </tr>
                            <tr>
                                <td className="py-3 font-medium text-slate-900 dark:text-white">Anti-Cheat Tab & Focus Tracking</td>
                                <td className="py-3 text-center">Standard</td>
                                <td className="py-3 text-center text-emerald-600">Advanced</td>
                                <td className="py-3 text-center text-emerald-600">Advanced</td>
                                <td className="py-3 text-center text-emerald-600">Full Suite</td>
                            </tr>
                            <tr>
                                <td className="py-3 font-medium text-slate-900 dark:text-white">Export Results to Excel (CSV/XLSX)</td>
                                <td className="py-3 text-center text-slate-400">—</td>
                                <td className="py-3 text-center text-emerald-600">✓</td>
                                <td className="py-3 text-center text-emerald-600">✓</td>
                                <td className="py-3 text-center text-emerald-600">✓</td>
                            </tr>
                            <tr>
                                <td className="py-3 font-medium text-slate-900 dark:text-white">Customer Support</td>
                                <td className="py-3 text-center">Community</td>
                                <td className="py-3 text-center">Email</td>
                                <td className="py-3 text-center">Priority</td>
                                <td className="py-3 text-center text-indigo-600 font-semibold">24/7 Dedicated</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Pricing FAQs Section */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 mb-8 shadow-sm">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 mb-3">
                            <HelpCircle className="w-3.5 h-3.5" />
                            Pricing & Trust Questions
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                            Frequently Asked Questions About Pricing
                        </h2>
                        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                            Clear answers to your questions about our free tier, plan limits, security, and payment options.
                        </p>
                    </div>

                    <div className="space-y-4 max-w-3xl mx-auto">
                        {PRICING_FAQS.map((faq, idx) => (
                            <details
                                key={idx}
                                className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-5 transition-all duration-200 hover:border-indigo-300 dark:hover:border-indigo-800 open:bg-white dark:open:bg-slate-900 open:shadow-sm"
                            >
                                <summary className="flex cursor-pointer items-center justify-between font-semibold text-slate-900 dark:text-slate-100 text-base md:text-lg list-none select-none">
                                    <span>{faq.q}</span>
                                    <ChevronDown className="w-5 h-5 text-slate-400 transition-transform duration-200 group-open:rotate-180 shrink-0 ml-4" />
                                </summary>
                                <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed text-sm md:text-base border-t border-slate-100 dark:border-slate-800 pt-3">
                                    {faq.a}
                                </p>
                            </details>
                        ))}
                    </div>
                </div>

                {/* Bottom note */}
                <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                    All prices are in INR and inclusive of applicable taxes. Subscriptions renew automatically. Cancel or modify anytime.
                </p>
            </div>
        </div>
    );
}
