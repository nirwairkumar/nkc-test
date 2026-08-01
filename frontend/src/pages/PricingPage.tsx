import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Package, Settings, Sparkles, Zap, Star } from 'lucide-react';
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
    const { isAdmin } = useAuth();
    const { isPremium, planId: currentPlanId, expiryDate } = usePremiumStatus();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const { fetchPlans } = await import('@/lib/pricingApi');
            const { data, error } = await fetchPlans();
            if (error) throw error;
            const activePlans = (data || []).filter((p: Plan) => p.is_active);
            setPlans(activePlans);
        } catch (error: any) {
            console.error('Error fetching plans:', error);
            toast.error('Failed to load plans');
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (paise: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(paise / 100);
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center space-y-3">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading pricing plans...</p>
                </div>
            </div>
        );
    }

    // Determine the "popular" plan (yearly, or the last one if no yearly)
    const popularPlanId = plans.find(p => p.duration_days >= 365)?.id ?? plans[plans.length - 1]?.id;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <SEO
                title="Pricing Plans - TestoZa Premium"
                description="Affordable pricing for TestoZa Premium. Unlock unlimited AI test generation, detailed analytics, and ad-free experience. Start for free."
                keywords={['testoza pricing', 'premium test maker', 'quiz maker cost', 'online exam software pricing']}
            />

            {/* Hero Header */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 pt-10 pb-16 text-center">
                <div className="max-w-2xl mx-auto">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">TestoZa Premium</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white mb-3">
                        Simple, Transparent Pricing
                    </p>
                    <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto leading-relaxed">
                        Choose the plan that fits your needs. Unlock premium features and take your testing experience to the next level.
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 -mt-6 pb-12 max-w-5xl mx-auto">
                {plans.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <EmptyState />
                    </div>
                ) : (
                    <div className={`grid gap-4 sm:gap-6 ${plans.length === 1 ? 'max-w-sm mx-auto' : plans.length === 2 ? 'sm:grid-cols-2 max-w-2xl mx-auto' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
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
                )}

                {/* Bottom note */}
                <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-8">
                    All prices are in INR and inclusive of applicable taxes. Subscriptions renew automatically.
                </p>
            </div>
        </div>
    );
}
