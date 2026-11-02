-- Platform feedback: the pop-up after a creator stops an exam now asks
-- "Did it fulfil your requirements?" with five faces, sad → excited, plus an optional note.
--
--   rating  1 = 😞 Not at all · 2 = 😕 Not really · 3 = 😐 Partly · 4 = 🙂 Mostly · 5 = 🤩 Fully
--
-- A face alone is a complete answer, so a row needs either a rating or some text.
-- Until this runs, the backend still saves ratings: it writes "Rated 4/5 · Mostly" into the
-- Online exam note and context.rating instead.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

alter table public.platform_feedback
    add column if not exists rating smallint check (rating between 1 and 5);

alter table public.platform_feedback drop constraint if exists platform_feedback_has_text;
alter table public.platform_feedback add constraint platform_feedback_has_text check (
    rating is not null
    or coalesce(nullif(btrim(ai), ''), nullif(btrim(conduct), ''), nullif(btrim(other), '')) is not null
);
