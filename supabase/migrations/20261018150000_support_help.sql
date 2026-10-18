-- Help page (app.testoza.com/help) and admin → Support.
--
-- A teacher writes their problem in the app; the message reaches the team (in-app
-- notification + email), the team replies from admin, and the teacher sees the reply on
-- the Help page and by email. Until now support_messages was write-only: six messages
-- since February, none of them shown anywhere.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

-- ── What a message carries ────────────────────────────────────────────────────
alter table public.support_messages
    add column if not exists topic           text,
    -- Page they came from, screen size, signed in or not: so nobody has to ask "which test?"
    add column if not exists context         jsonb,
    add column if not exists user_agent      text,
    -- Object path in the private support-uploads bucket; admins see it through a signed URL.
    add column if not exists screenshot_path text,
    add column if not exists source          text,   -- 'app' (signed-in Help page) | 'public' (/support)
    add column if not exists reply           text,
    add column if not exists replied_at      timestamptz;

-- status stays text: 'pending' (default, waiting for us) | 'replied' | 'resolved'.

create index if not exists support_messages_status_created_idx
    on public.support_messages (status, created_at desc);
create index if not exists support_messages_user_created_idx
    on public.support_messages (user_id, created_at desc) where user_id is not null;

-- ── Policies ──────────────────────────────────────────────────────────────────
-- SECURITY: "Block anon support delete" had qual (auth.uid() IS NOT NULL). DELETE
-- policies are OR'ed, so ANY signed-in user could delete EVERY support message.
drop policy if exists "Block anon support delete" on public.support_messages;

-- Messages now arrive only through the backend (service role, rate-limited per IP).
-- The open INSERT policies let anyone with the public key write rows directly and skip
-- that limit.
drop policy if exists "Anyone can submit support messages" on public.support_messages;
drop policy if exists "public_can_submit_support_messages" on public.support_messages;

-- Duplicate of users_can_view_own_support_messages.
drop policy if exists "Users can view own messages" on public.support_messages;

-- Kept: users_can_view_own_support_messages, admins_can_view_all_support_messages,
--       admins_can_update_support_messages, admins_can_delete_support_messages.

-- ── Screenshots ───────────────────────────────────────────────────────────────
-- Private: a screenshot can show student names and marks. Only the backend (service
-- role) writes or reads it, so no storage policies are needed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support-uploads', 'support-uploads', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
    set public = false,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
