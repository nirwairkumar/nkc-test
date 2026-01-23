-- Create promo_codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('flat', 'percentage')),
    value NUMERIC NOT NULL CHECK (value > 0),
    max_discount NUMERIC CHECK (max_discount > 0), -- Cap for percentage discount
    min_order_value NUMERIC DEFAULT 0,
    max_uses INTEGER, -- Null means unlimited
    used_count INTEGER NOT NULL DEFAULT 0,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_till TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create promo_redemptions table
CREATE TABLE IF NOT EXISTS public.promo_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_id UUID REFERENCES public.promo_codes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id TEXT, -- Razorpay Order ID or similar
    discount_amount NUMERIC NOT NULL,
    used_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(promo_id, user_id) -- One use per user per promo
);

-- RLS Policies

-- promo_codes: Admin full access, Authenticated users Read Only via function (secure)
-- Actually, strict security says users should NOT be able to select * from promo_codes directly.
-- They should blindly submit a code and get a result.
-- So we DISABLE Select for auth users on promo_codes, or restrict it significantly.
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promo codes" ON public.promo_codes
    USING ((auth.jwt() ->> 'email') IN (SELECT email FROM public.admins));

-- We intentionally DO NOT add a SELECT policy for normal users to prevent scraping.
-- They must use the backend function `apply-promo`.

-- promo_redemptions: Admin full access, Users can view their own.
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own redemptions" ON public.promo_redemptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all redemptions" ON public.promo_redemptions
    FOR SELECT USING ((auth.jwt() ->> 'email') IN (SELECT email FROM public.admins));

-- Admins can manage redemptions (cleanup etc if needed)
CREATE POLICY "Admins can manage redemptions" ON public.promo_redemptions
    USING ((auth.jwt() ->> 'email') IN (SELECT email FROM public.admins));

-- Insert some test data
INSERT INTO public.promo_codes (code, type, value, max_uses, valid_till)
VALUES ('WELCOME50', 'flat', 5000, 100, now() + interval '1 year')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.promo_codes (code, type, value, max_discount, max_uses, valid_till)
VALUES ('PRO20', 'percentage', 20, 20000, 100, now() + interval '1 year')
ON CONFLICT (code) DO NOTHING;
