-- Answers to TestoZa's own surveys. Survey 1.0 lives at app.testoza.com/survey/v1 and asks
-- educators who made a test why they didn't send it, or didn't send more.
--
-- One row = one person's answers. No user id or browser string, even for a signed-in sender.
-- Name, email and phone are optional, for people who want a reply (answers.name,
-- answers.email; the phone is also copied to `whatsapp`).
--
--   answers   {question id: option key | [option keys] | text}, only the questions on the
--             path the person took (backend app/routers/survey.py checks it)
--   status    the first answer (not_sent, sent_some, ...), kept as a column for filtering
--   reason    the main reason (from "not sent" or "sent" path), when there is one
--   context   {device: phone|tablet|computer, ref: where the link was opened from}
--
-- Admins read it in admin → Support → Survey 1.0. Writes and reads go through the backend
-- (service role), so RLS is on with no policies for anyone else.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

create table if not exists public.survey_responses (
    id          uuid primary key default gen_random_uuid(),
    created_at  timestamptz not null default now(),
    survey      text not null default 'v1' check (survey ~ '^[a-z0-9_-]{1,20}$'),
    answers     jsonb not null default '{}'::jsonb,
    status      text,
    reason      text,
    whatsapp    text check (whatsapp is null or char_length(whatsapp) <= 20),
    context     jsonb not null default '{}'::jsonb
);

create index if not exists survey_responses_survey_idx on public.survey_responses (survey, created_at desc);

alter table public.survey_responses enable row level security;
-- No policies: anon and signed-in clients can neither read nor write this table directly.
revoke all on public.survey_responses from anon, authenticated;
