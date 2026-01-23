import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
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
            const { data, error } = await supabase.functions.invoke('apply-promo', {
                body: { code: promoCode, planId: plan.id }
            });

            if (error) throw new Error(error.message || 'Failed to apply promo');

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
        <Card key={plan.id} className={`flex flex-col relative overflow-hidden ${plan.name.includes('Yearly') ? 'border-primary shadow-lg scale-105' : ''} ${isCurrentPlan ? 'border-green-500 ring-1 ring-green-500 bg-green-50/10' : ''}`}>
            {plan.name.includes('Yearly') && !isCurrentPlan && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-bl-lg">
                    Popular
                </div>
            )}
            {isCurrentPlan && (
                <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg flex items-center gap-1">
                    <Check className="w-3 h-3" /> Current Plan
                </div>
            )}
            <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="mb-6">
                    {appliedPromo ? (
                        <div className="flex flex-col">
                            <span className="text-muted-foreground line-through text-lg">{formatPrice(plan.price)}</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-green-600">{formatPrice(appliedPromo.finalPrice)}</span>
                                <span className="text-muted-foreground text-sm">/ {plan.duration_days >= 365 ? 'year' : 'month'}</span>
                            </div>
                            <Badge variant="outline" className="w-fit mt-1 border-green-200 bg-green-50 text-green-700">
                                Save {formatPrice(appliedPromo.discount)} with {appliedPromo.code}
                            </Badge>
                        </div>
                    ) : (
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold">{formatPrice(plan.price)}</span>
                            <span className="text-muted-foreground ml-1">
                                / {plan.duration_days >= 365 ? 'year' : 'month'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Promo Code Input - Only show if not current plan */}
                {!isCurrentPlan && (
                    <div className="mb-6 space-y-2">
                        {!appliedPromo ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Promo Code"
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 uppercase"
                                    value={promoCode}
                                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                />
                                <Button size="sm" variant="outline" onClick={handleApplyPromo} disabled={promoLoading || !promoCode}>
                                    {promoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Apply'}
                                </Button>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded px-3 py-2 text-sm">
                                <span className="text-green-700 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> {appliedPromo.code} applied</span>
                                <button onClick={handleRemovePromo} className="text-xs text-red-500 hover:underline">Remove</button>
                            </div>
                        )}
                    </div>
                )}

                <ul className="space-y-3 mb-6">
                    {Array.isArray(plan.features) && plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-green-500 shrink-0" />
                            <span className="text-sm">{feature}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter>
                {isCurrentPlan ? (
                    <Button className="w-full bg-green-600 hover:bg-green-700 cursor-default" disabled>
                        Active
                    </Button>
                ) : (
                    <PaymentButton
                        planId={plan.id}
                        amount={appliedPromo ? appliedPromo.finalPrice : plan.price}
                        promoCode={appliedPromo ? appliedPromo.code : undefined}
                        className="w-full"
                        onSuccess={() => window.location.reload()}
                    >
                        {isPremium ? 'Switch Plan' : 'Get Started'}
                    </PaymentButton>
                )}
            </CardFooter>
        </Card>
    );
}

export default function PricingPage() {
    const { user } = useAuth();
    const { isPremium, planId: currentPlanId } = usePremiumStatus();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const { data, error } = await supabase
                .from('plans')
                .select('*')
                .eq('is_active', true)
                .order('price', { ascending: true });

            if (error) throw error;
            setPlans(data || []);
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
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container py-16 max-w-6xl">
            <div className="text-center space-y-4 mb-12">
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                    Simple, Transparent Pricing
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Choose the plan that best fits your needs. Unlock premium features and take your testing experience to the next level.
                </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
                {plans.map((plan) => (
                    <PricingCard key={plan.id} plan={plan} isCurrentPlan={currentPlanId === plan.id} isPremium={isPremium} formatPrice={formatPrice} />
                ))}
            </div>
        </div>
    );
}
