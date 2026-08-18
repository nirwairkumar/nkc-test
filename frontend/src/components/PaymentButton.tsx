import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRazorpay } from '@/hooks/useRazorpay';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/contexts/AuthModalContext';
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
    const [isVerifying, setIsVerifying] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const { user } = useAuth();
    const { openAuthModal } = useAuthModal();
    const navigate = useNavigate();
    const location = useLocation();

    const handlePayment = async () => {
        if (!user) {
            toast.error("Please login to purchase");
            openAuthModal({ view: 'login', redirectPath: location.pathname });
            return;
        }

        if (!isRazorpayLoaded) {
            toast.error('Razorpay SDK not loaded. Please check your connection.');
            return;
        }

        setLoading(true);
        setStatusMessage("Initializing Payment...");

        try {
            // 1. Create Order
            const { createOrder } = await import('@/lib/paymentApi');
            const { data: orderData, error: orderError } = await createOrder({ planId, amount, currency, promoCode });

            if (orderError) throw orderError;

            // 2. Handle Free Transaction (100% Discount)
            if (orderData.is_free) {
                toast.success('Promo applied! Plan activated successfully.');
                if (onSuccess) onSuccess();
                setLoading(false);
                return;
            }

            const { order_id, key } = orderData;

            // 3. Open Razorpay Checkout
            const options = {
                key: key,
                amount: amount,
                currency: currency,
                name: "TestoZa",
                // description: "Premium Subscription",
                order_id: order_id,
                handler: async function (response: any) {
                    // 4. Verify Payment (Start Verification Overlay)
                    setIsVerifying(true);
                    setStatusMessage("Verifying Payment & Upgrading Profile...");

                    try {
                        const { verifyPayment } = await import('@/lib/paymentApi');
                        const { data: verifyData, error: verifyError } = await verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            planId: planId
                        });

                        if (verifyError) throw verifyError;

                        toast.success('Payment Successful! Premium activated.');
                        if (onSuccess) onSuccess();

                    } catch (verifyErr: any) {
                        console.error("Verification Error", verifyErr);
                        toast.error('Payment verification failed: ' + verifyErr.message);
                        setIsVerifying(false); // Only close on error, on success we might navigate/reload
                    } finally {
                        // Note: We might NOT want to close immediately on success if the parent reloads the page
                        // But for safety, let's keep it open if success happens (page reload will kill it)
                        // If we don't reload, we should close it.
                        // Given onSuccess does window.location.reload() in parent, this is fine.
                        // If verification fails, we clear state.
                    }
                },
                modal: {
                    ondismiss: function () {
                        setLoading(false);
                    }
                },
                prefill: {
                    name: user?.user_metadata?.full_name,
                    email: user?.email,
                },
                theme: {
                    color: "#3399cc"
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                toast.error('Payment Failed: ' + response.error.description);
                setLoading(false);
            });
            rzp.open();

        } catch (error: any) {
            console.error('Payment Error:', error);
            toast.error('Failed to initiate payment: ' + error.message);
            setLoading(false);
        }
        // removing finally{setLoading(false)} because we want it to stay true until modal closes or verification is done
    };

    return (
        <>
            <Button onClick={handlePayment} disabled={loading || !isRazorpayLoaded} className={className}>
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isVerifying ? 'Verifying...' : 'Initializing...'}
                    </>
                ) : (
                    children || 'Buy Now'
                )}
            </Button>

            {/* Full Screen Verification Overlay */}
            {isVerifying && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-6 max-w-sm mx-4 animate-in zoom-in-95 duration-300">
                        <div className="relative">
                            <div className="h-16 w-16 border-4 border-slate-100 rounded-full"></div>
                            <div className="absolute top-0 left-0 h-16 w-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-bold text-slate-900">Processing Payment</h3>
                            <p className="text-slate-600 font-medium">{statusMessage}</p>
                            <p className="text-xs text-slate-400 mt-2">Please do not close this window or refresh the page.</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
