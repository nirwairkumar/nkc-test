import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
        if (userError || !user) throw new Error('Unauthorized');

        const { code, planId } = await req.json()
        if (!code || !planId) throw new Error('Missing code or planId');

        // 1. Fetch Plan Price (Secure Source)
        const { data: plan, error: planError } = await supabaseClient
            .from('plans')
            .select('*')
            .eq('id', planId)
            .single();

        if (planError || !plan) throw new Error('Invalid Plan');

        // 2. Fetch Promo Code (Secure Source - Admin View)
        // Use Service Role to query promo_codes if RLS blocks read, or rely on public read if safe.
        // We set RLS to block users, so we need Service Role or a specific RPC.
        // Let's use Service Role for this specific check to ensure we get all fields safely.
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: promo, error: promoError } = await supabaseAdmin
            .from('promo_codes')
            .select('*')
            .eq('code', code.toUpperCase())
            .single();

        if (promoError || !promo) throw new Error('Invalid or Expired Promo Code');

        // 3. Validate Promo Code Rules
        const now = new Date();
        if (!promo.is_active) throw new Error('Promo Code is inactive');
        if (promo.valid_from && new Date(promo.valid_from) > now) throw new Error('Promo Code not yet valid');
        if (promo.valid_till && new Date(promo.valid_till) < now) throw new Error('Promo Code expired');
        if (promo.max_uses !== null && promo.used_count >= promo.max_uses) throw new Error('Promo Code usage limit exceeded');
        if (plan.price < (promo.min_order_value || 0)) throw new Error(`Order value must be at least ${promo.min_order_value / 100}`);

        // 4. Check if User Already Used It
        const { data: redemption, error: redemptionError } = await supabaseAdmin
            .from('promo_redemptions')
            .select('id')
            .eq('promo_id', promo.id)
            .eq('user_id', user.id)
            .single();

        if (redemption) throw new Error('You have already used this promo code');

        // 5. Calculate Discount
        let discount = 0;
        if (promo.type === 'flat') {
            discount = Number(promo.value);
        } else if (promo.type === 'percentage') {
            discount = (Number(plan.price) * Number(promo.value)) / 100;
            if (promo.max_discount) {
                discount = Math.min(discount, Number(promo.max_discount));
            }
        }

        // Cap discount at plan price (prevent negative)
        discount = Math.min(discount, Number(plan.price));

        // Final Calculation
        const finalPrice = Number(plan.price) - discount;

        return new Response(
            JSON.stringify({
                valid: true,
                code: promo.code,
                discount: discount,
                finalPrice: finalPrice,
                originalPrice: plan.price
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
