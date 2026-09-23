# Archived RLS scripts — DO NOT APPLY

These files are kept for history only. **Running any of them against production will
re-open security holes that have since been closed.**

## Why they are here

L1 of `SECURITY_THREAT_MODEL_AND_PLAN.md`: these scripts drifted away from the live
database. They were written at different times, several contradict each other, and
none of them matches production any more. Two concrete examples:

- `enable_feedback_rls.sql` declares `feedback` admin-only. Live, before the C2
  lockdown, `feedback` was readable by anyone with the public anon key.
- `step2_nuclear_rls_fix.sql` and its siblings were successive "just make it work"
  passes that ended in `USING (true)` policies — exactly the holes C2/C3 closed.

Because they look authoritative (`enable_*_rls.sql`, `security_fix_*.sql`), the real
risk was someone re-running one to "fix RLS" and silently undoing the lockdown.

## What replaced them

| Purpose | File |
|---|---|
| Source of truth for every live policy | `supabase/migrations/20260924000000_rls_baseline.sql` |
| Residual holes found while re-baselining | `supabase/migrations/20260924010000_l1_residual_rls_tightening.sql` |
| Drift detection + baseline regeneration | `scripts/check-rls-drift.sql` |

The baseline is generated from the live `pg_policies` catalog and is idempotent —
applying it reproduces production exactly rather than changing it.

## If you need something from these files

Read it, understand why it differs from the baseline, and write a **new** migration in
`supabase/migrations/`. Never re-run a file from this directory.

## Files

| File | What it did |
|---|---|
| `enable_categories_rls.sql` | early RLS bootstrap for `categories` |
| `enable_feedback_rls.sql` | claimed admin-only `feedback` (did not match live) |
| `enable_notifications_rls.sql` | early RLS bootstrap for `notifications` |
| `enable_profiles_rls.sql` | early `profiles` policies, incl. public read |
| `enable_support_rls.sql` | early `support_messages` policies |
| `enable_test_categories_rls.sql` | early `test_categories` policies |
| `enable_tests_rls.sql` | early `tests` policies, incl. unlisted-readable |
| `enable_user_tests_rls.sql` | early `user_tests` policies |
| `fix_all_rls_google_ads.sql` | broad loosening pass |
| `fix_insert_policy.sql` | ad-hoc INSERT loosening |
| `fix_support_rls_direct.sql` | ad-hoc `support_messages` patch |
| `fix_user_tests_rls.sql` | ad-hoc `user_tests` patch |
| `security_fix_registrations.sql` | ad-hoc `test_registrations` patch |
| `step2_nuclear_rls_fix.sql` | "nuclear" pass that ended in `USING (true)` |
