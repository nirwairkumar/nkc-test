-- Feedback about TestoZa itself, from the sidebar's Feedback page (app.testoza.com/feedback)
-- and from the card that comes up when a creator stops a live exam.
--
-- One row = one send: up to three short notes, one per part of the card
--   ai       "For: Generate with AI"
--   conduct  "For: Conduct online exam"
--   other    "Other"
-- At least one of them has text (the backend checks it too).
--
-- Admins read it in admin → Support → Feedback. Writes and reads go through the backend
-- (service role, app/routers/support.py), so RLS is on with no policies for anyone else.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

create table if not exists public.platform_feedback (
    id          uuid primary key default gen_random_uuid(),
    created_at  timestamptz not null default now(),
    user_id     uuid references auth.users (id) on delete set null,
    ai          text,
    conduct     text,
    other       text,
    -- 'sidebar' = the Feedback page, 'exam_ended' = the card after stopping an exam
    source      text not null default 'sidebar' check (source in ('sidebar', 'exam_ended')),
    -- The exam that was just stopped (a test id or an exam-session id), when source = 'exam_ended'.
    exam_id     uuid,
    exam_title  text,
    context     jsonb not null default '{}'::jsonb,
    user_agent  text,
    -- Set when an admin opens it; unread rows carry the badge in admin.
    read_at     timestamptz,
    constraint platform_feedback_has_text check (
        coalesce(nullif(btrim(ai), ''), nullif(btrim(conduct), ''), nullif(btrim(other), '')) is not null
    )
);

create index if not exists platform_feedback_created_idx on public.platform_feedback (created_at desc);
create index if not exists platform_feedback_unread_idx on public.platform_feedback (created_at desc) where read_at is null;
create index if not exists platform_feedback_user_idx on public.platform_feedback (user_id);

alter table public.platform_feedback enable row level security;
-- No policies: anon and signed-in clients can neither read nor write this table directly.
revoke all on public.platform_feedback from anon, authenticated;
