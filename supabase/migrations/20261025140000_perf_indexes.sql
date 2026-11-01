-- Indexes for the lookups the API makes most, found in pg_stat_statements on 2026-10-25.
-- Each table is small (under 2,000 rows), so every index builds in milliseconds and the
-- brief write lock is not noticeable. Safe to run more than once.

-- Notification bell: 62k calls since July, each a full scan (user_id had no index).
create index if not exists idx_notifications_user_created
    on public.notifications (user_id, created_at desc);

-- A candidate's history, "already attempted?" checks and answer-key access.
create index if not exists idx_user_tests_user_test
    on public.user_tests (user_id, test_id);

-- Progress pings and registration checks look up (test_id, user_id) together.
create index if not exists idx_test_registrations_test_user
    on public.test_registrations (test_id, user_id);

-- My Tests, the dashboard and the creator-name sync filter tests by owner.
create index if not exists idx_tests_created_by
    on public.tests (created_by);

-- Tests opened by their custom id (slug lookups already have an index).
create index if not exists idx_tests_custom_id
    on public.tests (custom_id);

analyze public.notifications, public.user_tests, public.test_registrations, public.tests;
