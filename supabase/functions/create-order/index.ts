import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Razorpay from "npm:razorpay@2.9.2"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

        if (userError || !user) {
            throw new Error('Unauthorized')
        }

        const razorpay = new Razorpay({
            key_id: Deno.env.get('RAZORPAY_KEY_ID'),
            key_secret: Deno.env.get('RAZORPAY_KEY_SECRET'),
        })

        // 3. Parse Request Body
        const { planId, promoCode } = await req.json()

        if (!planId) {
            return new Response(JSON.stringify({ error: "Missing planId" }), { status: 400, headers: corsHeaders })
        }

        // 4. Fetch Plan Details from Database (Secure Price Check)
        const { data: plan, error: planError } = await supabaseClient
            .from('plans')
            .select('price, name')
            .eq('id', planId)
            .single()

        if (planError || !plan) {
            console.error("Plan fetch error:", planError)
            return new Response(JSON.stringify({ error: "Invalid Plan" }), { status: 400, headers: corsHeaders })
        }

        let amount = plan.price // Price in paise from DB
        let discount = 0
        let appliedPromoId = null

        // 5. Apply Promo Code Logic (Server-Side Validation)
        if (promoCode) {
            // Use Service Role for Admin Access to Promo Codes
            const supabaseAdmin = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            const { data: promo, error: promoError } = await supabaseAdmin
                .from('promo_codes')
                .select('*')
                .eq('code', promoCode.toUpperCase())
                .single();

            if (promo && !promoError) {
                // Validate Promo Code Rules
                const now = new Date();
                const isValid = promo.is_active &&
                    (!promo.valid_from || new Date(promo.valid_from) <= now) &&
                    (!promo.valid_till || new Date(promo.valid_till) >= now) &&
                    (promo.max_uses === null || promo.used_count < promo.max_uses) &&
                    (plan.price >= (promo.min_order_value || 0));

                if (isValid) {
                    // Check if user already used it
                    const { data: redemption } = await supabaseAdmin
                        .from('promo_redemptions')
                        .select('id')
                        .eq('promo_id', promo.id)
                        .eq('user_id', user.id)
                        .single();

                    if (!redemption) {
                        // Apply Discount
                        if (promo.type === 'flat') {
                            discount = Number(promo.value);
                        } else if (promo.type === 'percentage') {
                            discount = (Number(plan.price) * Number(promo.value)) / 100;
                            if (promo.max_discount) {
                                discount = Math.min(discount, Number(promo.max_discount));
                            }
                        }
                        discount = Math.min(discount, Number(plan.price)); // Cap at plan price
                        amount = Math.max(0, Number(plan.price) - discount);
                        appliedPromoId = promo.id;
                    }
                }
            }
        }

        // 6. Handle 100% Discount (Free Transaction)
        if (amount === 0) {
            const supabaseAdmin = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            // Calculate expiry
            const expiryDate = new Date();
            // plan.duration_days default to 30 if missing (should be in DB though)
            const duration = plan.data?.duration_days || plan.duration_days || 30;
            expiryDate.setDate(expiryDate.getDate() + duration);

            // a. Update Profile
            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({
                    is_premium: true,
                    premium_expiry: expiryDate.toISOString(),
                    plan_id: planId
                })
                .eq('id', user.id);

            if (updateError) {
                console.error("Free Plan Update Error:", updateError);
                throw new Error('Failed to activate free plan: ' + JSON.stringify(updateError));
            }

            // b. Record Redemption
            if (appliedPromoId) {
                const { error: redemptionError } = await supabaseAdmin.from('promo_redemptions').insert({
                    promo_id: appliedPromoId,
                    user_id: user.id,
                    order_id: `free_${Date.now()}`,
                    discount_amount: discount
                });

                if (redemptionError) {
                    console.error("Free Plan Redemption Error:", redemptionError);
                }

                // c. Increment Usage
                // Optimistic update, or verify response.
                const { data: currentPromo } = await supabaseAdmin.from('promo_codes').select('used_count').eq('id', appliedPromoId).single();
                if (currentPromo) {
                    await supabaseAdmin.from('promo_codes').update({ used_count: currentPromo.used_count + 1 }).eq('id', appliedPromoId);
                }
            }

            return new Response(
                JSON.stringify({
                    is_free: true,
                    success: true,
                    message: 'Free plan activated successfully'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        const currency = 'INR'
        const receipt = `rcpt_${Date.now()}_${user.id.substring(0, 5)}`

        const options = {
            amount,
            currency,
            receipt,
            notes: {
                user_id: user.id,
                plan_id: planId,
                plan_name: plan.name,
                promo_id: appliedPromoId,
                original_price: plan.price,
                discount_amount: discount
            }
        }

        const order = await razorpay.orders.create(options)

        return new Response(
            JSON.stringify({
                order_id: order.id,
                amount: order.amount,
                key_id: Deno.env.get('RAZORPAY_KEY_ID')
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
