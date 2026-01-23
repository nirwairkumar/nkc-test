-- Make max_uses nullable to support Unlimited promos
ALTER TABLE public.promo_codes ALTER COLUMN max_uses DROP NOT NULL;
ALTER TABLE public.promo_codes ALTER COLUMN max_uses DROP DEFAULT;
