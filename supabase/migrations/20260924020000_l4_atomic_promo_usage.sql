-- ============================================================================
-- L4 (SECURITY_THREAT_MODEL_AND_PLAN.md) — atomic promo-code usage counting.
--
-- Both edge functions incremented `promo_codes.used_count` with a read-then-update:
--
--     const { data } = await admin.from('promo_codes').select('used_count')...
--     await admin.from('promo_codes').update({ used_count: data.used_count + 1 })...
--
-- (supabase/functions/verify-payment/index.ts and .../create-order/index.ts — the
-- code even carried a TODO saying "Production Fix: Create a DB function
-- increment_promo_usage(uuid)".)
--
-- Two concurrent redemptions both read N and both write N+1, so one redemption is
-- lost. Worse, `max_uses` is checked EARLIER in the request against the same stale
-- read, so a limited promo can be redeemed more times than it allows — a real
-- revenue leak on a launch code, which is exactly when concurrency is highest.
--
-- The fix is to make "check the limit and consume a use" a single atomic statement.
-- A bare UPDATE ... SET used_count = used_count + 1 is already atomic in Postgres
-- (the row lock serialises concurrent writers and each re-reads the current value),
-- and adding the limit to the WHERE clause makes the check atomic too: if the code
-- is exhausted, zero rows update and the function reports failure.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.increment_promo_usage(p_promo_id uuid)
RETURNS TABLE (success boolean, used_count integer, max_uses integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_used integer;
    v_max  integer;
BEGIN
    -- Single atomic statement: consume a use ONLY if the code is still active,
    -- inside its validity window, and under its limit. Concurrent callers queue on
    -- the row lock and each sees the other's committed increment.
    UPDATE public.promo_codes
       SET used_count = promo_codes.used_count + 1
     WHERE id = p_promo_id
       AND COALESCE(is_active, true) = true
       AND (valid_from  IS NULL OR valid_from  <= now())
       AND (valid_till  IS NULL OR valid_till  >= now())
       AND (max_uses    IS NULL OR promo_codes.used_count < max_uses)
    RETURNING promo_codes.used_count, promo_codes.max_uses
      INTO v_used, v_max;

    IF NOT FOUND THEN
        -- Exhausted, expired, inactive or unknown. Report the current state so the
        -- caller can tell the user why, without a second racy read.
        SELECT p.used_count, p.max_uses INTO v_used, v_max
          FROM public.promo_codes p WHERE p.id = p_promo_id;
        RETURN QUERY SELECT false, COALESCE(v_used, 0), v_max;
        RETURN;
    END IF;

    RETURN QUERY SELECT true, v_used, v_max;
END;
$$;

COMMENT ON FUNCTION public.increment_promo_usage(uuid) IS
    'L4: atomically consume one use of a promo code. Returns success=false when the '
    'code is exhausted, expired or inactive. Replaces the read-then-update race in '
    'the create-order / verify-payment edge functions.';

-- Only the service role (edge functions) may consume a use. Revoke from the public
-- roles so nobody can burn down a promo code straight from the anon key.
REVOKE ALL ON FUNCTION public.increment_promo_usage(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_promo_usage(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.increment_promo_usage(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_promo_usage(uuid) TO service_role;

-- Belt and braces: the counter must never exceed the limit even if some other code
-- path writes it directly.
ALTER TABLE public.promo_codes DROP CONSTRAINT IF EXISTS promo_codes_used_within_max;
ALTER TABLE public.promo_codes
    ADD CONSTRAINT promo_codes_used_within_max
    CHECK (max_uses IS NULL OR used_count <= max_uses) NOT VALID;

COMMIT;

-- ── Verification ────────────────────────────────────────────────────────────
-- 1) Function exists and is service-role only:
--    SELECT p.proname, pg_get_function_identity_arguments(p.oid),
--           has_function_privilege('anon',         p.oid, 'EXECUTE') AS anon_can,
--           has_function_privilege('authenticated',p.oid, 'EXECUTE') AS auth_can,
--           has_function_privilege('service_role', p.oid, 'EXECUTE') AS svc_can
--      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--     WHERE n.nspname='public' AND p.proname='increment_promo_usage';
--    Expect: anon_can=false, auth_can=false, svc_can=true
--
-- 2) Limit is enforced atomically (run against a throwaway code):
--    INSERT INTO promo_codes (code,type,value,max_uses,used_count)
--      VALUES ('__TEST_L4__','percent',10,1,0) RETURNING id;
--    SELECT * FROM increment_promo_usage('<id>');  -- success=true,  used_count=1
--    SELECT * FROM increment_promo_usage('<id>');  -- success=false, used_count=1
--    DELETE FROM promo_codes WHERE code='__TEST_L4__';
--
-- NOTE: the CHECK is added NOT VALID so it applies to new writes without failing on
-- any historical row that already exceeded its limit through the old race. To find
-- and fix such rows, then validate:
--   SELECT id, code, used_count, max_uses FROM promo_codes
--    WHERE max_uses IS NOT NULL AND used_count > max_uses;
--   ALTER TABLE promo_codes VALIDATE CONSTRAINT promo_codes_used_within_max;
