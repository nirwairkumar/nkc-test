-- ============================================================================
-- L1 (SECURITY_THREAT_MODEL_AND_PLAN.md) — RLS BASELINE / SOURCE OF TRUTH
--
-- Generated 2026-09-24 from the live `pg_policies` catalog (Supabase MCP, read-only),
-- AFTER the C2/C3 lockdown migrations were applied. Verified at generation time:
--     visitors/sessions/page_views/anon_test_attempts .... 0 policies
--     profiles public SELECT USING(true) ................. 0
--     user_tests unconditional writes .................... 0
--     public_profiles view ............................... present
--     total policies ..................................... 129
--
-- WHY THIS FILE EXISTS
-- The repo had accumulated 19 hand-written RLS scripts (`enable_*_rls.sql`,
-- `fix_*_rls.sql`, `step2_nuclear_rls_fix.sql`, ...) that no longer matched
-- production. Re-running any one of them would have silently re-opened holes that
-- C2/C3 closed — e.g. the old `enable_feedback_rls.sql` claims feedback is
-- admin-only while live it was public-readable. Those files are archived under
-- supabase/_archive_do_not_apply/ and this file replaces them.
--
-- PROPERTIES
--   * Idempotent — every policy is dropped before being recreated.
--   * Faithful — this is exactly what is live, including historical duplicates
--     (e.g. `categories` has four equivalent public SELECT policies). Duplicates
--     are PERMISSIVE and therefore harmless (they OR together); they are kept so
--     applying this file is a no-op against production rather than a behaviour
--     change. Consolidating them is a separate, reviewable decision.
--   * This file does NOT enable/disable RLS or create tables. RLS is already
--     enabled on every table listed here.
--
-- DRIFT CHECK: see scripts/check-rls-drift.sql
-- ============================================================================

BEGIN;

-- ── admins ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can check their own admin status" ON public.admins;
CREATE POLICY "Users can check their own admin status" ON public.admins FOR SELECT TO public
    USING (((auth.jwt() ->> 'email'::text) = email));

-- ── ai_generation_history ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can delete their own AI history" ON public.ai_generation_history;
CREATE POLICY "Users can delete their own AI history" ON public.ai_generation_history FOR DELETE TO public
    USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can insert their own AI history" ON public.ai_generation_history;
CREATE POLICY "Users can insert their own AI history" ON public.ai_generation_history FOR INSERT TO public
    WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can view their own AI history" ON public.ai_generation_history;
CREATE POLICY "Users can view their own AI history" ON public.ai_generation_history FOR SELECT TO public
    USING ((auth.uid() = user_id));

-- ── app_settings (C2: no public SELECT; served via /api/features/flags) ──────
DROP POLICY IF EXISTS "Admins can insert app settings" ON public.app_settings;
CREATE POLICY "Admins can insert app settings" ON public.app_settings FOR INSERT TO public
    WITH CHECK ((EXISTS ( SELECT 1 FROM admins WHERE (admins.email = (auth.jwt() ->> 'email'::text)))));
DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;
CREATE POLICY "Admins can update app settings" ON public.app_settings FOR UPDATE TO public
    USING ((EXISTS ( SELECT 1 FROM admins WHERE (admins.email = (auth.jwt() ->> 'email'::text)))));

-- ── categories (four equivalent public-read policies kept verbatim) ─────────
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated
    USING ((EXISTS ( SELECT 1 FROM admins WHERE (admins.email = (auth.jwt() ->> 'email'::text)))));
DROP POLICY IF EXISTS "Enable all access for admins" ON public.categories;
CREATE POLICY "Enable all access for admins" ON public.categories FOR ALL TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Anyone can view sections" ON public.categories;
CREATE POLICY "Anyone can view sections" ON public.categories FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories" ON public.categories FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Sections are viewable by everyone." ON public.categories;
CREATE POLICY "Sections are viewable by everyone." ON public.categories FOR SELECT TO public USING (true);

-- ── classes (C2: public read removed; creator/admin only) ───────────────────
DROP POLICY IF EXISTS "Creator Full Access Classes" ON public.classes;
CREATE POLICY "Creator Full Access Classes" ON public.classes FOR ALL TO public
    USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Enable all access for admins" ON public.classes;
CREATE POLICY "Enable all access for admins" ON public.classes FOR ALL TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());

-- ── combined_attempts ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can create their own combined attempts" ON public.combined_attempts;
CREATE POLICY "Users can create their own combined attempts" ON public.combined_attempts FOR INSERT TO public
    WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can delete their own combined attempts" ON public.combined_attempts;
CREATE POLICY "Users can delete their own combined attempts" ON public.combined_attempts FOR DELETE TO public
    USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can view their own combined attempts" ON public.combined_attempts;
CREATE POLICY "Users can view their own combined attempts" ON public.combined_attempts FOR SELECT TO public
    USING ((auth.uid() = user_id));

-- ── combined_sessions ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Creators can create combined sessions" ON public.combined_sessions;
CREATE POLICY "Creators can create combined sessions" ON public.combined_sessions FOR INSERT TO public
    WITH CHECK ((auth.uid() = created_by));
DROP POLICY IF EXISTS "Creators can delete their own sessions" ON public.combined_sessions;
CREATE POLICY "Creators can delete their own sessions" ON public.combined_sessions FOR DELETE TO public
    USING ((auth.uid() = created_by));
DROP POLICY IF EXISTS "Creators can update their own sessions" ON public.combined_sessions;
CREATE POLICY "Creators can update their own sessions" ON public.combined_sessions FOR UPDATE TO public
    USING ((auth.uid() = created_by));
DROP POLICY IF EXISTS "Creators can view their own sessions" ON public.combined_sessions;
CREATE POLICY "Creators can view their own sessions" ON public.combined_sessions FOR SELECT TO public
    USING ((auth.uid() = created_by));
DROP POLICY IF EXISTS "Public combined sessions are viewable by everyone" ON public.combined_sessions;
CREATE POLICY "Public combined sessions are viewable by everyone" ON public.combined_sessions FOR SELECT TO public
    USING ((is_public = true));

-- ── exit_feedback ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow admins to view feedback" ON public.exit_feedback;
CREATE POLICY "Allow admins to view feedback" ON public.exit_feedback FOR SELECT TO authenticated
    USING (is_admin());
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.exit_feedback;
CREATE POLICY "Allow anonymous inserts" ON public.exit_feedback FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- ── feedback (C2: public SELECT removed; admin + own-email only) ────────────
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;
CREATE POLICY "Admins can view all feedback" ON public.feedback FOR SELECT TO authenticated
    USING ((EXISTS ( SELECT 1 FROM admins WHERE (admins.email = (auth.jwt() ->> 'email'::text)))));
DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
CREATE POLICY "Users can view own feedback" ON public.feedback FOR SELECT TO authenticated
    USING ((((auth.jwt() ->> 'email'::text) = sender_email) OR ((auth.jwt() ->> 'email'::text) = receiver_email)));
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.feedback;
CREATE POLICY "Anyone can insert feedback" ON public.feedback FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
CREATE POLICY "Anyone can submit feedback" ON public.feedback FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Public can submit feedback" ON public.feedback;
CREATE POLICY "Public can submit feedback" ON public.feedback FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Block anon feedback delete" ON public.feedback;
CREATE POLICY "Block anon feedback delete" ON public.feedback FOR DELETE TO public
    USING ((auth.uid() IS NOT NULL));

-- ── follows (social graph is intentionally public) ──────────────────────────
DROP POLICY IF EXISTS "Public follows are viewable by everyone" ON public.follows;
CREATE POLICY "Public follows are viewable by everyone" ON public.follows FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Users can create their own follows" ON public.follows;
CREATE POLICY "Users can create their own follows" ON public.follows FOR INSERT TO public
    WITH CHECK ((auth.uid() = follower_id));
DROP POLICY IF EXISTS "Users can delete their own follows" ON public.follows;
CREATE POLICY "Users can delete their own follows" ON public.follows FOR DELETE TO public
    USING ((auth.uid() = follower_id));

-- ── materials (C2: public read removed; creator only) ───────────────────────
DROP POLICY IF EXISTS "Creator Full Access" ON public.materials;
CREATE POLICY "Creator Full Access" ON public.materials FOR ALL TO public
    USING ((auth.uid() = user_id));

-- ── notifications (C3b: public INSERT removed) ──────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications FOR INSERT TO public
    WITH CHECK ((auth.role() = 'authenticated'::text));
DROP POLICY IF EXISTS "Block anon notification delete" ON public.notifications;
CREATE POLICY "Block anon notification delete" ON public.notifications FOR DELETE TO public
    USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE TO authenticated
    USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO public
    USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO public
    USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT TO public
    USING ((auth.uid() = user_id));

-- ── plans (public read of ACTIVE plans only) ────────────────────────────────
DROP POLICY IF EXISTS "Everyone can view active plans" ON public.plans;
CREATE POLICY "Everyone can view active plans" ON public.plans FOR SELECT TO public
    USING ((is_active = true));
DROP POLICY IF EXISTS "Admins can view all plans" ON public.plans;
CREATE POLICY "Admins can view all plans" ON public.plans FOR SELECT TO public
    USING ((EXISTS ( SELECT 1 FROM admins WHERE (admins.email = (auth.jwt() ->> 'email'::text)))));
DROP POLICY IF EXISTS "Admins can insert plans" ON public.plans;
CREATE POLICY "Admins can insert plans" ON public.plans FOR INSERT TO public
    WITH CHECK ((EXISTS ( SELECT 1 FROM admins WHERE (admins.email = (auth.jwt() ->> 'email'::text)))));
DROP POLICY IF EXISTS "Admins can update plans" ON public.plans;
CREATE POLICY "Admins can update plans" ON public.plans FOR UPDATE TO public
    USING ((EXISTS ( SELECT 1 FROM admins WHERE (admins.email = (auth.jwt() ->> 'email'::text)))));
DROP POLICY IF EXISTS "Admins can delete plans" ON public.plans;
CREATE POLICY "Admins can delete plans" ON public.plans FOR DELETE TO public
    USING ((EXISTS ( SELECT 1 FROM admins WHERE (admins.email = (auth.jwt() ->> 'email'::text)))));

-- ── post_likes ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read post likes" ON public.post_likes;
CREATE POLICY "Public read post likes" ON public.post_likes FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Authenticated users can like" ON public.post_likes;
CREATE POLICY "Authenticated users can like" ON public.post_likes FOR INSERT TO public
    WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can unlike their own likes" ON public.post_likes;
CREATE POLICY "Users can unlike their own likes" ON public.post_likes FOR DELETE TO public
    USING ((auth.uid() = user_id));

-- ── posts ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read published posts" ON public.posts;
CREATE POLICY "Public read published posts" ON public.posts FOR SELECT TO public
    USING ((status = 'published'::text));
DROP POLICY IF EXISTS "Authors read own posts" ON public.posts;
CREATE POLICY "Authors read own posts" ON public.posts FOR SELECT TO public
    USING ((auth.uid() = author_id));
DROP POLICY IF EXISTS "Authors update own posts" ON public.posts;
CREATE POLICY "Authors update own posts" ON public.posts FOR UPDATE TO public
    USING ((auth.uid() = author_id));
DROP POLICY IF EXISTS "Authors delete own posts" ON public.posts;
CREATE POLICY "Authors delete own posts" ON public.posts FOR DELETE TO public
    USING ((auth.uid() = author_id));
DROP POLICY IF EXISTS "Verified creators can create posts" ON public.posts;
CREATE POLICY "Verified creators can create posts" ON public.posts FOR INSERT TO public
    WITH CHECK (((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.is_verified_creator = true))))
              OR (EXISTS ( SELECT 1 FROM admins WHERE (admins.email = (auth.jwt() ->> 'email'::text))))));

-- ── profiles (C2: owner-only; public data served by public_profiles view) ───
DROP POLICY IF EXISTS "Admins have full access" ON public.profiles;
CREATE POLICY "Admins have full access" ON public.profiles FOR ALL TO authenticated
    USING ((EXISTS ( SELECT 1 FROM admins WHERE (admins.email = (auth.jwt() ->> 'email'::text)))));
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated
    USING ((auth.uid() = id));
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO public
    WITH CHECK ((auth.uid() = id));
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO public
    USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));
DROP POLICY IF EXISTS "Block anon profile deletes" ON public.profiles;
CREATE POLICY "Block anon profile deletes" ON public.profiles FOR DELETE TO public
    USING ((auth.uid() = id));

-- ── promo_codes / promo_redemptions ─────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage promo codes" ON public.promo_codes;
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes FOR ALL TO public
    USING (((auth.jwt() ->> 'email'::text) IN ( SELECT admins.email FROM admins)));
DROP POLICY IF EXISTS "Admins can manage redemptions" ON public.promo_redemptions;
CREATE POLICY "Admins can manage redemptions" ON public.promo_redemptions FOR ALL TO public
    USING (((auth.jwt() ->> 'email'::text) IN ( SELECT admins.email FROM admins)));
DROP POLICY IF EXISTS "Admins can view all redemptions" ON public.promo_redemptions;
CREATE POLICY "Admins can view all redemptions" ON public.promo_redemptions FOR SELECT TO public
    USING (((auth.jwt() ->> 'email'::text) IN ( SELECT admins.email FROM admins)));
DROP POLICY IF EXISTS "Users can view own redemptions" ON public.promo_redemptions;
CREATE POLICY "Users can view own redemptions" ON public.promo_redemptions FOR SELECT TO public
    USING ((auth.uid() = user_id));

-- ── question_reports ────────────────────────────────────────────────────────
-- NOTE: "Auth users can view reports" is USING(auth.uid() IS NOT NULL) — any logged-in
-- user can read EVERY creator's reports. Flagged in the L1 re-baseline; see
-- 20260924010000_l1_residual_rls_tightening.sql (not applied by this file).
DROP POLICY IF EXISTS "Anyone can insert reports" ON public.question_reports;
CREATE POLICY "Anyone can insert reports" ON public.question_reports FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can submit reports" ON public.question_reports;
CREATE POLICY "Anyone can submit reports" ON public.question_reports FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Auth users can view reports" ON public.question_reports;
CREATE POLICY "Auth users can view reports" ON public.question_reports FOR SELECT TO public
    USING ((auth.uid() IS NOT NULL));
DROP POLICY IF EXISTS "Creators can view their own reports" ON public.question_reports;
CREATE POLICY "Creators can view their own reports" ON public.question_reports FOR SELECT TO public
    USING ((auth.uid() = creator_id));
DROP POLICY IF EXISTS "Creators can update their own reports" ON public.question_reports;
CREATE POLICY "Creators can update their own reports" ON public.question_reports FOR UPDATE TO public
    USING ((auth.uid() = creator_id));
DROP POLICY IF EXISTS "Block anon report delete" ON public.question_reports;
CREATE POLICY "Block anon report delete" ON public.question_reports FOR DELETE TO public
    USING ((auth.uid() IS NOT NULL));

-- ── sub_categories (C2: ALL USING(true) removed; read-only taxonomy) ────────
DROP POLICY IF EXISTS "Allow public read on sub_categories" ON public.sub_categories;
CREATE POLICY "Allow public read on sub_categories" ON public.sub_categories FOR SELECT TO public USING (true);

-- ── support_messages ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can submit support messages" ON public.support_messages;
CREATE POLICY "Anyone can submit support messages" ON public.support_messages FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS public_can_submit_support_messages ON public.support_messages;
CREATE POLICY public_can_submit_support_messages ON public.support_messages FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Users can view own messages" ON public.support_messages;
CREATE POLICY "Users can view own messages" ON public.support_messages FOR SELECT TO public
    USING (((user_id IS NOT NULL) AND (auth.uid() = user_id)));
DROP POLICY IF EXISTS users_can_view_own_support_messages ON public.support_messages;
CREATE POLICY users_can_view_own_support_messages ON public.support_messages FOR SELECT TO public
    USING (((user_id IS NOT NULL) AND (auth.uid() = user_id)));
DROP POLICY IF EXISTS admins_can_view_all_support_messages ON public.support_messages;
CREATE POLICY admins_can_view_all_support_messages ON public.support_messages FOR SELECT TO public
    USING ((EXISTS ( SELECT 1 FROM admins WHERE (admins.email = (auth.jwt() ->> 'email'::text)))));
DROP POLICY IF EXISTS admins_can_update_support_messages ON public.support_messages;
CREATE POLICY admins_can_update_support_messages ON public.support_messages FOR UPDATE TO public
    USING ((EXISTS ( SELECT 1 FROM admins WHERE (admins.email = (auth.jwt() ->> 'email'::text)))));
DROP POLICY IF EXISTS admins_can_delete_support_messages ON public.support_messages;
CREATE POLICY admins_can_delete_support_messages ON public.support_messages FOR DELETE TO public
    USING ((EXISTS ( SELECT 1 FROM admins WHERE (admins.email = (auth.jwt() ->> 'email'::text)))));
DROP POLICY IF EXISTS "Block anon support delete" ON public.support_messages;
CREATE POLICY "Block anon support delete" ON public.support_messages FOR DELETE TO public
    USING ((auth.uid() IS NOT NULL));

-- ── test_categories ─────────────────────────────────────────────────────────
-- NOTE: "Admins can insert test_sections." is WITH CHECK(true) — despite the name it
-- lets anyone insert. Flagged in the L1 re-baseline; see the residual-tightening file.
DROP POLICY IF EXISTS "Admins can add categories" ON public.test_categories;
CREATE POLICY "Admins can add categories" ON public.test_categories FOR INSERT TO public
    WITH CHECK ((EXISTS ( SELECT 1 FROM admins WHERE (admins.email = (auth.jwt() ->> 'email'::text)))));
DROP POLICY IF EXISTS "Admins can insert test_sections." ON public.test_categories;
CREATE POLICY "Admins can insert test_sections." ON public.test_categories FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can remove test categories" ON public.test_categories;
CREATE POLICY "Admins can remove test categories" ON public.test_categories FOR DELETE TO public
    USING ((EXISTS ( SELECT 1 FROM admins WHERE (admins.email = (auth.jwt() ->> 'email'::text)))));
DROP POLICY IF EXISTS "Admins can update test categories" ON public.test_categories;
CREATE POLICY "Admins can update test categories" ON public.test_categories FOR UPDATE TO public
    USING ((EXISTS ( SELECT 1 FROM admins WHERE (admins.email = (auth.jwt() ->> 'email'::text)))));
DROP POLICY IF EXISTS "Anyone can view test sections" ON public.test_categories;
CREATE POLICY "Anyone can view test sections" ON public.test_categories FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public can view test categories" ON public.test_categories;
CREATE POLICY "Public can view test categories" ON public.test_categories FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Test Sections are viewable by everyone." ON public.test_categories;
CREATE POLICY "Test Sections are viewable by everyone." ON public.test_categories FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Creators can add categories to their tests" ON public.test_categories;
CREATE POLICY "Creators can add categories to their tests" ON public.test_categories FOR INSERT TO public
    WITH CHECK ((EXISTS ( SELECT 1 FROM tests WHERE ((tests.id = test_categories.test_id) AND (tests.created_by = auth.uid())))));
DROP POLICY IF EXISTS "Creators can remove categories from their tests" ON public.test_categories;
CREATE POLICY "Creators can remove categories from their tests" ON public.test_categories FOR DELETE TO public
    USING ((EXISTS ( SELECT 1 FROM tests WHERE ((tests.id = test_categories.test_id) AND (tests.created_by = auth.uid())))));
DROP POLICY IF EXISTS "Creators can update their test categories" ON public.test_categories;
CREATE POLICY "Creators can update their test categories" ON public.test_categories FOR UPDATE TO public
    USING ((EXISTS ( SELECT 1 FROM tests WHERE ((tests.id = test_categories.test_id) AND (tests.created_by = auth.uid())))))
    WITH CHECK ((EXISTS ( SELECT 1 FROM tests WHERE ((tests.id = test_categories.test_id) AND (tests.created_by = auth.uid())))));
DROP POLICY IF EXISTS "Users can manage sections for their own tests" ON public.test_categories;
CREATE POLICY "Users can manage sections for their own tests" ON public.test_categories FOR ALL TO public
    USING ((EXISTS ( SELECT 1 FROM tests WHERE ((tests.id = test_categories.test_id) AND (tests.created_by = auth.uid())))));

-- ── test_invitations ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Creators can insert own test invitations" ON public.test_invitations;
CREATE POLICY "Creators can insert own test invitations" ON public.test_invitations FOR INSERT TO public
    WITH CHECK (((auth.uid() = creator_id) OR (EXISTS ( SELECT 1 FROM admins
        WHERE (admins.email = ( SELECT profiles.email FROM profiles WHERE (profiles.id = auth.uid())))))));
DROP POLICY IF EXISTS "Creators can view own test invitations" ON public.test_invitations;
CREATE POLICY "Creators can view own test invitations" ON public.test_invitations FOR SELECT TO public
    USING (((auth.uid() = creator_id) OR (EXISTS ( SELECT 1 FROM admins
        WHERE (admins.email = ( SELECT profiles.email FROM profiles WHERE (profiles.id = auth.uid())))))));

-- ── test_registrations (C3b: blanket authenticated read removed) ────────────
DROP POLICY IF EXISTS "Test creators can view registrations for their tests" ON public.test_registrations;
CREATE POLICY "Test creators can view registrations for their tests" ON public.test_registrations FOR SELECT TO public
    USING ((EXISTS ( SELECT 1 FROM tests WHERE ((tests.id = test_registrations.test_id) AND (tests.created_by = auth.uid())))));
DROP POLICY IF EXISTS "Users can see own registrations" ON public.test_registrations;
CREATE POLICY "Users can see own registrations" ON public.test_registrations FOR SELECT TO authenticated
    USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can view own registrations" ON public.test_registrations;
CREATE POLICY "Users can view own registrations" ON public.test_registrations FOR SELECT TO public
    USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can view their own registrations" ON public.test_registrations;
CREATE POLICY "Users can view their own registrations" ON public.test_registrations FOR SELECT TO public
    USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can insert their own registrations" ON public.test_registrations;
CREATE POLICY "Users can insert their own registrations" ON public.test_registrations FOR INSERT TO public
    WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can register for tests" ON public.test_registrations;
CREATE POLICY "Users can register for tests" ON public.test_registrations FOR INSERT TO public
    WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can register themselves" ON public.test_registrations;
CREATE POLICY "Users can register themselves" ON public.test_registrations FOR INSERT TO authenticated
    WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can update own registrations" ON public.test_registrations;
CREATE POLICY "Users can update own registrations" ON public.test_registrations FOR UPDATE TO public
    USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Block anon registrations delete" ON public.test_registrations;
CREATE POLICY "Block anon registrations delete" ON public.test_registrations FOR DELETE TO public
    USING ((auth.uid() = user_id));

-- ── test_results ────────────────────────────────────────────────────────────
-- NOTE: "Users can view own results" / "Users can insert own results" are only
-- USING(auth.uid() IS NOT NULL) — despite the names, ANY logged-in user can read and
-- insert every row. Flagged in the L1 re-baseline; see the residual-tightening file.
DROP POLICY IF EXISTS "Admins can view all results" ON public.test_results;
CREATE POLICY "Admins can view all results" ON public.test_results FOR SELECT TO public
    USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.designation = 'Admin'::text)))));
DROP POLICY IF EXISTS "Users can view own results" ON public.test_results;
CREATE POLICY "Users can view own results" ON public.test_results FOR SELECT TO public
    USING ((auth.uid() IS NOT NULL));
DROP POLICY IF EXISTS "Users can view their own results" ON public.test_results;
CREATE POLICY "Users can view their own results" ON public.test_results FOR SELECT TO public
    USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can insert own results" ON public.test_results;
CREATE POLICY "Users can insert own results" ON public.test_results FOR INSERT TO public
    WITH CHECK ((auth.uid() IS NOT NULL));
DROP POLICY IF EXISTS "Users can submit test results" ON public.test_results;
CREATE POLICY "Users can submit test results" ON public.test_results FOR INSERT TO public
    WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Block anon test_results delete" ON public.test_results;
CREATE POLICY "Block anon test_results delete" ON public.test_results FOR DELETE TO public
    USING ((auth.uid() IS NOT NULL));

-- ── tests (C2: anon sees ONLY visibility='public'; answer columns revoked) ──
DROP POLICY IF EXISTS "Public tests are readable" ON public.tests;
CREATE POLICY "Public tests are readable" ON public.tests FOR SELECT TO public
    USING ((visibility = 'public'::test_visibility));
DROP POLICY IF EXISTS "Creators can view their own tests" ON public.tests;
CREATE POLICY "Creators can view their own tests" ON public.tests FOR SELECT TO public
    USING ((auth.uid() = created_by));
DROP POLICY IF EXISTS "Enable all access for admins" ON public.tests;
CREATE POLICY "Enable all access for admins" ON public.tests FOR ALL TO public USING (is_admin());
DROP POLICY IF EXISTS "Allow authenticated users to create tests" ON public.tests;
CREATE POLICY "Allow authenticated users to create tests" ON public.tests FOR INSERT TO public
    WITH CHECK (((auth.uid() IS NOT NULL) AND (created_by = auth.uid())));
DROP POLICY IF EXISTS "Authenticated users can create tests" ON public.tests;
CREATE POLICY "Authenticated users can create tests" ON public.tests FOR INSERT TO public
    WITH CHECK ((auth.uid() = created_by));
DROP POLICY IF EXISTS "Allow users to update their own tests" ON public.tests;
CREATE POLICY "Allow users to update their own tests" ON public.tests FOR UPDATE TO public
    USING ((created_by = auth.uid())) WITH CHECK ((created_by = auth.uid()));
DROP POLICY IF EXISTS "Creators can update their own tests" ON public.tests;
CREATE POLICY "Creators can update their own tests" ON public.tests FOR UPDATE TO public
    USING ((auth.uid() = created_by));
DROP POLICY IF EXISTS "Allow users to delete their own tests" ON public.tests;
CREATE POLICY "Allow users to delete their own tests" ON public.tests FOR DELETE TO public
    USING ((created_by = auth.uid()));
DROP POLICY IF EXISTS "Creators can delete their own tests" ON public.tests;
CREATE POLICY "Creators can delete their own tests" ON public.tests FOR DELETE TO public
    USING ((auth.uid() = created_by));

-- ── user_tests (C3b: unconditional INSERT/UPDATE removed) ───────────────────
DROP POLICY IF EXISTS "Admins can view all attempts" ON public.user_tests;
CREATE POLICY "Admins can view all attempts" ON public.user_tests FOR SELECT TO public
    USING ((EXISTS ( SELECT 1 FROM admins WHERE (admins.email = (auth.jwt() ->> 'email'::text)))));
DROP POLICY IF EXISTS "Admins can update any attempt" ON public.user_tests;
CREATE POLICY "Admins can update any attempt" ON public.user_tests FOR UPDATE TO public
    USING ((EXISTS ( SELECT 1 FROM admins WHERE (admins.email = (auth.jwt() ->> 'email'::text)))));
DROP POLICY IF EXISTS "Admins can delete any attempt" ON public.user_tests;
CREATE POLICY "Admins can delete any attempt" ON public.user_tests FOR DELETE TO public
    USING ((EXISTS ( SELECT 1 FROM admins WHERE (admins.email = (auth.jwt() ->> 'email'::text)))));
DROP POLICY IF EXISTS "Creators can view attempts for their tests" ON public.user_tests;
CREATE POLICY "Creators can view attempts for their tests" ON public.user_tests FOR SELECT TO public
    USING ((EXISTS ( SELECT 1 FROM tests WHERE ((tests.id = user_tests.test_id) AND (tests.created_by = auth.uid())))));
DROP POLICY IF EXISTS "Creators can delete attempts on their tests" ON public.user_tests;
CREATE POLICY "Creators can delete attempts on their tests" ON public.user_tests FOR DELETE TO public
    USING ((EXISTS ( SELECT 1 FROM tests WHERE ((tests.id = user_tests.test_id) AND (tests.created_by = auth.uid())))));
DROP POLICY IF EXISTS "Owner can read" ON public.user_tests;
CREATE POLICY "Owner can read" ON public.user_tests FOR SELECT TO public USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "User reads own attempts" ON public.user_tests;
CREATE POLICY "User reads own attempts" ON public.user_tests FOR SELECT TO public USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can view their own attempts" ON public.user_tests;
CREATE POLICY "Users can view their own attempts" ON public.user_tests FOR SELECT TO public USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Owner can update" ON public.user_tests;
CREATE POLICY "Owner can update" ON public.user_tests FOR UPDATE TO public
    USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "User updates own attempts" ON public.user_tests;
CREATE POLICY "User updates own attempts" ON public.user_tests FOR UPDATE TO public
    USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can update their own attempts" ON public.user_tests;
CREATE POLICY "Users can update their own attempts" ON public.user_tests FOR UPDATE TO public
    USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Owner can delete" ON public.user_tests;
CREATE POLICY "Owner can delete" ON public.user_tests FOR DELETE TO public USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "User deletes own attempts" ON public.user_tests;
CREATE POLICY "User deletes own attempts" ON public.user_tests FOR DELETE TO public USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can delete their own attempts" ON public.user_tests;
CREATE POLICY "Users can delete their own attempts" ON public.user_tests FOR DELETE TO public USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.user_tests;
CREATE POLICY "Enable delete for users based on user_id" ON public.user_tests FOR DELETE TO public USING ((auth.uid() = user_id));

-- ── Tables that intentionally have ZERO policies (C3) ───────────────────────
-- visitors, sessions, page_views, anon_test_attempts, daily_stats
-- RLS is ENABLED with no policy: anon/authenticated get nothing, and the backend
-- reaches them as service_role (BYPASSRLS). Do NOT add policies to these.

COMMIT;

-- ── Verification ────────────────────────────────────────────────────────────
-- Expect 129:
--   SELECT count(*) FROM pg_policies WHERE schemaname='public';
-- Expect 0 rows (the C2/C3 invariants):
--   SELECT tablename, policyname FROM pg_policies
--   WHERE schemaname='public'
--     AND tablename IN ('visitors','sessions','page_views','anon_test_attempts');
