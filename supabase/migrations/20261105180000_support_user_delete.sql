-- Help page: a writer can delete a conversation from their own Help page (owner, 5 Nov 2026).
--
-- Deleting only hides it from the writer. The row stays for admin → Support and
-- team.testoza.com as read-only history; only an admin deletes it for good (the backend
-- deletes the row, and support_replies goes with it through ON DELETE CASCADE).
-- A delete also closes the conversation (status = resolved) so it never sits in "Waiting".
--
-- The writer's own SELECT policies stop returning deleted conversations, so they are gone
-- from the browser's direct API too, not just from the page. Safe to run more than once.

alter table public.support_messages
    add column if not exists user_deleted_at timestamptz;

comment on column public.support_messages.user_deleted_at is
    'When the writer deleted it from their Help page. Kept for the team as read-only history.';

-- "Does this writer already have an open conversation?" runs on every new message.
create index if not exists support_messages_user_open_idx
    on public.support_messages (user_id, created_at desc)
    where user_id is not null and user_deleted_at is null;

drop policy if exists users_can_view_own_support_messages on public.support_messages;
create policy users_can_view_own_support_messages on public.support_messages
    for select to public
    using (user_id is not null and auth.uid() = user_id and user_deleted_at is null);

drop policy if exists support_replies_owner_select on public.support_replies;
create policy support_replies_owner_select on public.support_replies
    for select to public
    using (exists (
        select 1 from public.support_messages m
        where m.id = support_replies.message_id
          and m.user_id is not null
          and m.user_id = auth.uid()
          and m.user_deleted_at is null
    ));
