-- Help messages become conversations, and the old duplicate alerts go.
--
-- 1. Two leftover triggers from Feb 2026 (20260202110000_support_email_notifications.sql)
--    fired on every new support message:
--      on_support_message_created  → a second admin notification ("New Support Message: …"),
--                                    so every message showed twice in admin → Notifications.
--      "send-support-email"        → an edge function that has answered 400 on every call
--                                    (it never sent an email). Its definition also carried
--                                    the service-role key in plain text.
--    The backend (services/support_mail.py) now sends the one notification and the emails.
--
-- 2. support_replies: the back-and-forth on a message. The teacher writes from the Help
--    page, the team answers from admin (Support tab or Notifications); each side is told.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

-- ── 1. Old triggers ───────────────────────────────────────────────────────────
drop trigger if exists on_support_message_created on public.support_messages;
drop function if exists public.handle_new_support_message();
drop trigger if exists "send-support-email" on public.support_messages;

-- ── 2. Conversation ───────────────────────────────────────────────────────────
create table if not exists public.support_replies (
    id          uuid primary key default gen_random_uuid(),
    message_id  uuid not null references public.support_messages (id) on delete cascade,
    author      text not null check (author in ('team', 'user')),
    author_id   uuid,
    body        text not null,
    created_at  timestamptz not null default now()
);

create index if not exists support_replies_message_created_idx
    on public.support_replies (message_id, created_at);

-- Newest conversation first in admin, whoever spoke last.
alter table public.support_messages
    add column if not exists last_activity_at timestamptz;
update public.support_messages
    set last_activity_at = greatest(created_at, coalesce(replied_at, created_at))
    where last_activity_at is null;
alter table public.support_messages
    alter column last_activity_at set default now();
create index if not exists support_messages_activity_idx
    on public.support_messages (last_activity_at desc);

-- Replies sent before this table existed (single `reply` column) join the conversation.
insert into public.support_replies (message_id, author, body, created_at)
select m.id, 'team', m.reply, coalesce(m.replied_at, m.created_at)
from public.support_messages m
where m.reply is not null
  and not exists (select 1 from public.support_replies r where r.message_id = m.id);

-- Reads: the writer sees their own conversation, admins see all. Writes go through the
-- backend (service role) only, so there are no insert/update policies.
alter table public.support_replies enable row level security;

drop policy if exists support_replies_owner_select on public.support_replies;
create policy support_replies_owner_select on public.support_replies
    for select using (
        exists (select 1 from public.support_messages m
                where m.id = support_replies.message_id and m.user_id is not null and m.user_id = auth.uid())
    );

drop policy if exists support_replies_admin_select on public.support_replies;
create policy support_replies_admin_select on public.support_replies
    for select using (
        exists (select 1 from public.admins a where a.email = (auth.jwt() ->> 'email'))
    );

-- ── 3. Duplicates the old trigger already left in admin → Notifications ───────
-- Its notifications link support://details?…&id=<message>. Remove each one that has a
-- backend notification for the same message (…tab=support&id=<message>) beside it.
delete from public.notifications n
where n.link like 'support://%'
  and exists (
      select 1 from public.notifications b
      where b.user_id = n.user_id
        and b.link like '%tab=support&id=' || substring(n.link from '[?&]id=([0-9a-fA-F-]{36})') || '%'
  );
