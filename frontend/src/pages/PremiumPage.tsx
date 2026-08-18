import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Crown, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';

interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    duration_days: number;
    features: string[];
    is_active?: boolean;
}

export default function PremiumPage() {
    const { user, loading: authLoading } = useAuth();
    const { openAuthModal } = useAuthModal();
    const { isPremium, loading: statusLoading } = usePremiumStatus();
    const navigate = useNavigate();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        const { fetchPlans } = await import('@/lib/pricingApi');
        const { data, error } = await fetchPlans();

        if (error) {
            console.error('Error fetching plans:', error);
        } else {
            // Filter active
            const activePlans = (data || []).filter((p: Plan) => p.is_active || (p as any).is_active === undefined); // flexible
            setPlans(activePlans);
        }
        setLoadingPlans(false);
    };

    const handleSubscribe = async (plan: Plan) => {
        if (!user) {
            openAuthModal({ view: 'login', redirectPath: '/premium' });
            return;
        }

        setProcessingId(plan.id);

        try {
            // 1. Create Order via API
            // Note: We now send planId instead of amount
            const { createOrder } = await import('@/lib/paymentApi');
            const { data, error } = await createOrder({
                planId: plan.id,
                userId: user.id
            });

            if (error) throw new Error(error.message || 'Failed to initiate payment');
            const { orderId, key } = data;

            // 2. Open Razorpay
            const options = {
                key: key,
                amount: plan.price,
                currency: "INR",
                name: "TestoZa Premium",
                description: `Upgrade to ${plan.name}`,
                order_id: orderId,
                handler: async (response: any) => {
                    toast.loading("Verifying Payment...");

                    // 3. Verify Payment
                    const { verifyPayment } = await import('@/lib/paymentApi');
                    const verifyRes = await verifyPayment({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        userId: user.id,
                        planId: plan.id
                    });

                    if (verifyRes.error) {
                        toast.dismiss();
                        toast.error("Verification failed. Please contact support.");
                    } else {
                        toast.dismiss();
                        toast.success("Upgrade Successful! Welcome to Premium.");
                        navigate('/profile');
                        window.location.reload(); // Refresh to update premium status hooks
                    }
                },
                prefill: {
                    name: user.user_metadata?.full_name,
                    email: user.email,
                },
                theme: {
                    color: "#0f172a"
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();

        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Payment initialization failed");
        } finally {
            setProcessingId(null);
        }
    };

    const formatPrice = (paise: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(paise / 100);
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <SEO
                title="Premium Features - TestoZa Pro"
                description="Unlock the full power of TestoZa with Premium. Advanced analytics, unlimited tests, priority support, and more."
                keywords={["testoza premium", "pro features", "advanced analytics", "unlimited tests"]}
            />
            <div className="container mx-auto max-w-6xl space-y-12">

                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                        Upgrade your Learning Experience
                    </h1>
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                        Get unlimited access to premium tests, detailed analytics, and exclusive content.
                        Choose the plan that suits you best.
                    </p>
                </div>

                {/* Plans Grid */}
                {loadingPlans ? (
                    <div className="flex justify-center p-10">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {plans.map((plan) => (
                            <Card key={plan.id} className={`relative flex flex-col hover:shadow-xl transition-shadow border-2 ${processingId === plan.id ? 'border-primary' : 'border-slate-100'}`}>
                                {plan.name.toLowerCase().includes('year') && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-md flex items-center gap-1">
                                        <Crown className="w-3 h-3" /> Best Value
                                    </div>
                                )}
                                <CardHeader className="text-center pb-2">
                                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                                    <CardDescription>{plan.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 text-center space-y-6 pt-4">
                                    <div className="flex items-center justify-center">
                                        <span className="text-4xl font-extrabold text-slate-900">
                                            {formatPrice(plan.price)}
                                        </span>
                                        <span className="text-muted-foreground ml-2 text-sm">
                                            / {plan.duration_days > 300 ? 'year' : 'month'}
                                        </span>
                                    </div>

                                    <ul className="space-y-3 text-left max-w-[200px] mx-auto">
                                        {Array.isArray(plan.features) && plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                                <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter className="pt-4 pb-8">
                                    <Button
                                        className="w-full text-lg h-12 relative overflow-hidden group"
                                        size="lg"
                                        onClick={() => handleSubscribe(plan)}
                                        disabled={!!processingId || (isPremium && plan.duration_days < 365)} // Disable monthly if already premium? Just logic example.
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                                        {processingId === plan.id ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                Processing...
                                            </>
                                        ) : isPremium ? (
                                            "Extend Membership"
                                        ) : (
                                            "Get Started"
                                        )}
                                    </Button>
                                    <p className="text-xs text-center w-full mt-4 text-muted-foreground flex items-center justify-center gap-1">
                                        <ShieldCheck className="w-3 h-3" /> Secure Payment via Razorpay
                                    </p>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
