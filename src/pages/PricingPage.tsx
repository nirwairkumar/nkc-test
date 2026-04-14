import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Package, Settings } from 'lucide-react';
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
const EmptyState = ({ isAdmin }: { isAdmin: boolean }) => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full p-8 mb-6">
                <Package className="w-16 h-16 text-blue-500" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-3">No Plans Available</h2>
            <p className="text-lg text-slate-600 text-center max-w-md mb-6">
                There are currently no pricing plans available. {isAdmin ? 'Create your first plan to get started!' : 'Please check back later or contact support.'}
            </p>
            {isAdmin && (
                <Button
                    onClick={() => navigate('/admin/pricing')}
                    size="lg"
                    className="gap-2"
                >
                    <Settings className="w-4 h-4" />
                    Go to Admin Panel
                </Button>
            )}
        </div>
    );
};

// Promo Code Logic Component
const PricingCard = ({ plan, isCurrentPlan, isPremium, formatPrice }: { plan: Plan, isCurrentPlan: boolean, isPremium: boolean, formatPrice: (p: number) => string }) => {
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<{ code: string, discount: number, finalPrice: number } | null>(null);
    const [promoLoading, setPromoLoading] = useState(false);

    const handleApplyPromo = async () => {
        if (!promoCode.trim()) {
            toast.error("Please enter a promo code");
            return;
        }
        setPromoLoading(true);
        try {
            const { applyPromo } = await import('@/lib/pricingApi');
            const { data, error } = await applyPromo(promoCode, plan.id);

            if (error) throw new Error(error.response?.data?.detail || error.message || 'Failed to apply promo');

            setAppliedPromo({
                code: data.code,
                discount: data.discount,
                finalPrice: data.finalPrice
            });
            toast.success(`Promo applied! You save ${formatPrice(data.discount)}`);
        } catch (error: any) {
            console.error("Promo Error", error);
            toast.error(error.message || "Invalid promo code");
            setAppliedPromo(null);
        } finally {
            setPromoLoading(false);
        }
    };

    const handleRemovePromo = () => {
        setAppliedPromo(null);
        setPromoCode('');
    };

    return (
        <Card key={plan.id} className={`flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-xl ${plan.name.includes('Yearly') && !isCurrentPlan ? 'border-primary shadow-lg scale-[1.02]' : ''} ${isCurrentPlan ? 'border-2 border-emerald-500 shadow-[0_0_30px_-5px_rgba(16,185,129,0.25)] ring-4 ring-emerald-500/10 bg-gradient-to-b from-white to-emerald-50/30 scale-[1.02] z-10' : ''}`}>
            {plan.name.includes('Yearly') && !isCurrentPlan && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1.5 text-sm font-bold rounded-bl-lg shadow-md z-20">
                    POPULAR
                </div>
            )}
            {isCurrentPlan && (
                <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2 text-sm font-bold flex items-center justify-center gap-2 shadow-sm w-full">
                    <Check className="w-5 h-5" /> CURRENT SUBSCRIPTION
                </div>
            )}
            <CardHeader className={`${isCurrentPlan ? 'pt-6 pb-4' : 'pb-4'}`}>
                <CardTitle className="text-3xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-base mt-2">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
                <div>
                    {appliedPromo ? (
                        <div className="flex flex-col">
                            <span className="text-muted-foreground line-through text-xl">{formatPrice(plan.price)}</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-extrabold text-green-600">{formatPrice(appliedPromo.finalPrice)}</span>
                                <span className="text-lg text-muted-foreground font-medium">/ {plan.duration_days >= 365 ? 'year' : 'month'}</span>
                            </div>
                            <Badge variant="outline" className="w-fit mt-2 border-green-300 bg-green-100 text-green-800 px-3 py-1 text-sm">
                                💰 Save {formatPrice(appliedPromo.discount)} with {appliedPromo.code}
                            </Badge>
                        </div>
                    ) : (
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{formatPrice(plan.price)}</span>
                            <span className="text-lg text-muted-foreground font-medium">
                                / {plan.duration_days >= 365 ? 'year' : 'month'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Promo Code Input - Only show if not current plan */}
                {!isCurrentPlan && (
                    <div className="space-y-2">
                        {!appliedPromo ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Enter Promo Code"
                                    className="flex h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder:text-slate-400 uppercase"
                                    value={promoCode}
                                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                />
                                <Button size="default" variant="outline" onClick={handleApplyPromo} disabled={promoLoading || !promoCode} className="px-6 font-semibold">
                                    {promoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                                </Button>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center bg-green-100 border-2 border-green-300 rounded-lg px-4 py-3">
                                <span className="text-green-800 font-bold flex items-center gap-2">
                                    <Check className="w-4 h-4" /> {appliedPromo.code} Applied
                                </span>
                                <button onClick={handleRemovePromo} className="text-sm text-red-600 hover:text-red-700 font-semibold hover:underline">
                                    Remove
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <ul className="space-y-4">
                    {Array.isArray(plan.features) && plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                            <div className="bg-green-100 rounded-full p-1 mt-0.5">
                                <Check className="h-4 w-4 text-green-600 shrink-0" />
                            </div>
                            <span className="text-base text-slate-700 leading-relaxed">{feature}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter className="pt-6">
                {isCurrentPlan ? (
                    <Button className="w-full h-12 text-base font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 cursor-default shadow-md" disabled>
                        ✓ Active Plan
                    </Button>
                ) : (
                    <PaymentButton
                        planId={plan.id}
                        amount={appliedPromo ? appliedPromo.finalPrice : plan.price}
                        promoCode={appliedPromo ? appliedPromo.code : undefined}
                        className="w-full h-12 text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
                        onSuccess={() => window.location.reload()}
                    >
                        {isPremium ? '🔄 Switch Plan' : '🚀 Get Started'}
                    </PaymentButton>
                )}
            </CardFooter>
        </Card>
    );
}

export default function PricingPage() {
    const { user, isAdmin } = useAuth();
    const { isPremium, planId: currentPlanId } = usePremiumStatus();
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
            maximumFractionDigits: 0
        }).format(paise / 100);
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
                    <p className="text-lg text-slate-600 font-medium">Loading pricing plans...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-20 max-w-7xl">
            <SEO
                title="Pricing Plans - TestoZa Premium"
                description="Affordable pricing for TestoZa Premium. Unlock unlimited AI test generation, detailed analytics, and ad-free experience. Start for free."
                keywords={["testoza pricing", "premium test maker", "quiz maker cost", "online exam software pricing"]}
            />
            <div className="text-center space-y-6 mb-16">
                <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Simple, Transparent Pricing
                </h1>
                <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                    Choose the plan that best fits your needs. Unlock premium features and take your testing experience to the next level.
                </p>
            </div>

            {plans.length === 0 ? (
                <EmptyState isAdmin={isAdmin} />
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {plans.map((plan) => (
                        <PricingCard key={plan.id} plan={plan} isCurrentPlan={currentPlanId === plan.id} isPremium={isPremium} formatPrice={formatPrice} />
                    ))}
                </div>
            )}
        </div>
    );
}
