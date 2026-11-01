import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Razorpay from "npm:razorpay@2.9.2"
import * as crypto from "node:crypto";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // 1. Authenticate User
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) {
            throw new Error('Unauthorized')
        }

        // 2. Parse Request
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = await req.json()

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planId) {
            throw new Error('Missing payment details or planId')
        }

        // 3. Verify Signature
        const secret = Deno.env.get('RAZORPAY_KEY_SECRET');
        if (!secret) throw new Error('Server misconfiguration: Missing Razorpay Secret');

        const generated_signature = crypto
            .createHmac('sha256', secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            throw new Error('Invalid Payment Signature');
        }

        // 4. Fetch Plan Duration to calculate expiry
        const { data: plan, error: planError } = await supabaseClient
            .from('plans')
            .select('duration_days')
            .eq('id', planId)
            .single();

        if (planError || !plan) {
            console.error("Plan fetch error during verification:", planError);
            throw new Error('Invalid Plan selected');
        }

        // 3a. Fetch Order Details from Razorpay to get trusted Notes
        // We cannot trust the frontend to pass promo_id. We trust the Order created by our Backend.
        let orderNotes = {};
        try {
            const razorpay = new Razorpay({
                key_id: Deno.env.get('RAZORPAY_KEY_ID'),
                key_secret: Deno.env.get('RAZORPAY_KEY_SECRET'),
            });
            const orderInfo = await razorpay.orders.fetch(razorpay_order_id);
            if (orderInfo) orderNotes = orderInfo.notes || {};
        } catch (e) {
            console.error("Failed to fetch order from Razorpay", e);
            // Fail safe: If we can't verify notes, we proceed with Plan activation but log error.
            // Or strict: Throw error.
        }

        // 5. Update User Profile (Using Service Role)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 6. Handle Promo Redemption
        if (orderNotes.promo_id) {
            const promoId = orderNotes.promo_id;
            const discountAmount = orderNotes.discount_amount || 0;

            // Record Redemption
            const { error: redemptionError } = await supabaseAdmin
                .from('promo_redemptions')
                .insert({
                    promo_id: promoId,
                    user_id: user.id,
                    order_id: razorpay_order_id,
                    discount_amount: discountAmount
                });

            if (!redemptionError) {
                // L4: atomic consume. The old read-then-update lost increments under
                // concurrency AND let a limited code be redeemed past its max_uses.
                // increment_promo_usage() does the limit check and the increment in one
                // statement; see supabase/migrations/20260924020000_l4_atomic_promo_usage.sql
                const { data: promoUsage, error: promoUsageError } = await supabaseAdmin
                    .rpc('increment_promo_usage', { p_promo_id: promoId });

                const consumed = Array.isArray(promoUsage) ? promoUsage[0] : promoUsage;
                if (promoUsageError || !consumed?.success) {
                    // The payment already succeeded, so never fail the request here —
                    // the user keeps their plan. Log it for reconciliation instead.
                    console.error('Promo usage could not be consumed (exhausted or expired)', {
                        promoId,
                        error: promoUsageError?.message,
                        used_count: consumed?.used_count,
                        max_uses: consumed?.max_uses,
                    });
                }
            } else {
                console.error("Failed to record promo redemption", redemptionError);
            }
        }

        // Calculate expiry based on plan duration
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + (plan.duration_days || 30));

        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                is_premium: true,
                premium_expiry: expiryDate.toISOString(),
                plan_id: planId
            })
            .eq('id', user.id)

        if (updateError) {
            console.error("Database Update Error:", updateError);
            throw new Error('Failed to update premium status');
        }

        return new Response(
            JSON.stringify({ success: true, message: 'Premium activated successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error("Payment Verification Failed:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
