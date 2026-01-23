import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRazorpay } from '@/hooks/useRazorpay';
import supabase from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

interface PaymentButtonProps {
    planId: string;
    amount: number; // in paise
    currency?: string;
    promoCode?: string;
    onSuccess?: () => void;
    children?: React.ReactNode;
    className?: string;
}

export default function PaymentButton({ planId, amount, currency = 'INR', promoCode, onSuccess, children, className }: PaymentButtonProps) {
    const isRazorpayLoaded = useRazorpay();
    const [loading, setLoading] = useState(false);
    const { user } = useAuth(); // Assuming useAuth exposes 'user'
    const navigate = useNavigate();
    const location = useLocation();

    const handlePayment = async () => {
        if (!user) {
            toast.error("Please login to purchase");
            navigate('/login', { state: { from: location.pathname } });
            return;
        }

        if (!isRazorpayLoaded) {
            toast.error('Razorpay SDK not loaded. Please check your connection.');
            return;
        }

        setLoading(true);

        try {
            // 1. Create Order
            const { data: orderData, error: orderError } = await supabase.functions.invoke('create-order', {
                body: { planId, amount, currency, promoCode }
            });

            if (orderError) throw orderError;

            // 2. Handle Free Transaction (100% Discount)
            if (orderData.is_free) {
                toast.success('Promo applied! Plan activated successfully.');
                if (onSuccess) onSuccess();
                return; // Stop here, don't open Razorpay
            }

            const { order_id, key } = orderData;

            // 3. Open Razorpay Checkout
            const options = {
                key: key,
                amount: amount,
                currency: currency,
                name: "Testoza",
                description: "Premium Subscription",
                order_id: order_id,
                handler: async function (response: any) {
                    // 4. Verify Payment
                    try {
                        const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-payment', {
                            body: {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                planId: planId
                            }
                        });

                        if (verifyError) throw verifyError;

                        toast.success('Payment Successful! Premium activated.');
                        if (onSuccess) onSuccess();

                    } catch (verifyErr: any) {
                        console.error("Verification Error", verifyErr);
                        toast.error('Payment verification failed: ' + verifyErr.message);
                    }
                },
                prefill: {
                    name: (await supabase.auth.getUser()).data.user?.user_metadata?.full_name,
                    email: (await supabase.auth.getUser()).data.user?.email,
                },
                theme: {
                    color: "#3399cc"
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                toast.error('Payment Failed: ' + response.error.description);
            });
            rzp.open();

        } catch (error: any) {
            console.error('Payment Error:', error);
            toast.error('Failed to initiate payment: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button onClick={handlePayment} disabled={loading || !isRazorpayLoaded} className={className}>
            {loading ? 'Processing...' : children || 'Buy Now'}
        </Button>
    );
}
