-- ════════════════════════════════════════════════════════════════════════════
-- Security (2026-10-16). Independent of every other migration; run any time.
--
-- 1. The answer key was still readable with the public anon key.
--    20260923100000_c2_lock_public_reads.sql ran
--        REVOKE SELECT (questions, solutions, sections) ON public.tests FROM anon;
--    but a column REVOKE does nothing while the role still holds SELECT on the whole
--    table, and Supabase grants anon/authenticated full table privileges by default.
--    Verified live on 2026-10-16: has_column_privilege('anon','public.tests','questions',
--    'SELECT') = true, i.e. anyone with the key in the JS bundle could run
--        GET /rest/v1/tests?select=questions&visibility=eq.public
--    and download the questions and correct answers of all 152 public tests (~15 MB).
--    RLS still hid unlisted/private rows, so live exams were not exposed.
--
--    Fix: take table-wide SELECT away and grant back only the columns that are safe.
--    New columns added later are NOT readable through the anon key until granted here —
--    the safe default. The browser only ever reads id, title, created_at, custom_id,
--    settings, created_by and total_max_marks directly (rewardsApi, FullTestAnalysisPage);
--    everything else goes through the backend, which uses the service role and is
--    unaffected. RLS policies on other tables only reference tests.id / created_by.
--
-- 2. Functions that run with the owner's rights (SECURITY DEFINER) were callable by
--    anyone through /rest/v1/rpc/…:
--      • notify_admins_generic — anyone could put a notification with any title, text and
--        link into every admin's inbox (phishing the admin panel).
--      • get_creator_rewards_stats, increment_post_view — data / counter tampering.
--      • trigger functions — not callable as RPC, revoked to clear the advisor.
--    Only the backend (service role) calls these; triggers do not need EXECUTE at fire
--    time. is_admin() stays callable: RLS policies call it as the signed-in user.
--
-- 3. SECURITY DEFINER functions without a fixed search_path get one.
--
-- Idempotent: safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. tests: no answer key through the anon / authenticated keys ──────────
REVOKE SELECT ON public.tests FROM anon, authenticated;
GRANT SELECT (
    id, title, description, created_by, created_at, custom_id, duration, is_public,
    creator_name, creator_avatar, institution_name, institution_logo, institution_color, institution_font,
    settings, slug, tags, custom_category, enable_section_mode, has_scientific_calculator,
    section_marking_model, visibility, class_id, total_questions, total_max_marks, is_cloned, cloned_from_id
) ON public.tests TO anon, authenticated;
-- Not granted: questions, sections, solutions, merged_sections, sections_metadata, revision_notes.


-- ─── 2. Owner-rights functions: backend only ─────────────────────────────────
DO $$
DECLARE f record;
BEGIN
    FOR f IN
        SELECT p.oid::regprocedure AS sig
          FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND p.proname IN (
               'notify_admins_generic', 'get_creator_rewards_stats', 'increment_post_view',
               'handle_new_user', 'handle_new_support_message', 'prevent_premium_update',
               'update_app_settings_timestamp',
               -- Not owner-rights, but takes an is_admin flag from the caller; backend only.
               'search_tests_ranked')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    END LOOP;
END $$;


-- ─── 3. Fixed search_path (every name in these bodies is schema-qualified) ──
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_creator_rewards_stats(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_post_view(uuid) SET search_path = public, pg_temp;

COMMIT;


-- ─── Verify (each should return the value shown) ─────────────────────────────
-- SELECT has_column_privilege('anon', 'public.tests', 'questions', 'SELECT');           -- false
-- SELECT has_column_privilege('authenticated', 'public.tests', 'solutions', 'SELECT');  -- false
-- SELECT has_column_privilege('anon', 'public.tests', 'title', 'SELECT');               -- true
-- SELECT has_function_privilege('anon', 'public.notify_admins_generic(text,text,text,text,text)', 'EXECUTE'); -- false
-- SELECT has_function_privilege('authenticated', 'public.is_admin()', 'EXECUTE');       -- true
