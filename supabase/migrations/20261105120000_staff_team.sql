-- ═══════════════════════════════════════════════════════════════════════════════
-- Team dashboard (team.testoza.com): employee accounts, sessions, activity log.
-- Plan: TestoZa/Team-Dashboard/TEAM_DASHBOARD_PLAN.md
--
-- Employees are NOT Supabase Auth users. They sign in with a login ID + password +
-- 6-digit authenticator code, checked by the backend (app/core/staff_security.py,
-- app/routers/staff/*). Only the backend (service role) can read or write these tables:
-- RLS is on with no policies, and every right is revoked from anon/authenticated.
--
-- Safe to run more than once.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. staff_accounts: one row per employee ─────────────────────────────────────
create table if not exists public.staff_accounts (
    id                    uuid primary key default gen_random_uuid(),
    login_id              text not null unique
                          check (login_id ~ '^[a-z][a-z0-9._-]{2,31}$'),
    full_name             text not null check (char_length(full_name) between 1 and 80),
    contact_email         text check (contact_email is null or char_length(contact_email) <= 254),
    role_label            text not null default 'Custom' check (char_length(role_label) <= 40),
    permissions           text[] not null default '{}',
    status                text not null default 'active'
                          check (status in ('active', 'suspended', 'removed')),
    expires_at            timestamptz,                 -- access end date (internship end)
    password_hash         text not null,               -- scrypt$N$r$p$salt$hash, never the password
    must_change_password  boolean not null default true,
    password_changed_at   timestamptz,
    totp_secret           text,                        -- AES-GCM encrypted ("v1." prefix)
    totp_pending          text,                        -- encrypted, during first set-up only
    totp_enabled_at       timestamptz,
    totp_last_step        bigint,                      -- last 30-second step used (replay guard)
    failed_attempts       integer not null default 0,
    locked_until          timestamptz,
    last_login_at         timestamptz,
    last_login_ip         text,
    created_by            uuid references auth.users(id) on delete set null,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);

-- ── 2. staff_sessions: one row per sign-in ──────────────────────────────────────
-- The browser holds a random token in an HttpOnly cookie; only its SHA-256 is stored.
create table if not exists public.staff_sessions (
    id              uuid primary key default gen_random_uuid(),
    staff_id        uuid not null references public.staff_accounts(id) on delete cascade,
    token_hash      text not null unique,
    stage           text not null check (stage in ('mfa', 'full')),
    mfa_attempts    integer not null default 0,
    created_at      timestamptz not null default now(),
    last_seen_at    timestamptz not null default now(),
    expires_at      timestamptz not null,
    ip              text,
    user_agent      text,
    revoked_at      timestamptz,
    revoked_reason  text
);
create index if not exists staff_sessions_live_idx
    on public.staff_sessions (staff_id) where revoked_at is null;

-- ── 3. staff_audit_log: append-only activity log ────────────────────────────────
create table if not exists public.staff_audit_log (
    id           bigint generated always as identity primary key,
    created_at   timestamptz not null default now(),
    actor_type   text not null check (actor_type in ('staff', 'admin', 'anonymous', 'system')),
    actor_id     uuid,
    actor_label  text,
    action       text not null,
    target_type  text,
    target_id    text,
    detail       jsonb not null default '{}'::jsonb,
    ip           text,
    user_agent   text
);
create index if not exists staff_audit_log_created_idx on public.staff_audit_log (created_at desc);
create index if not exists staff_audit_log_actor_idx on public.staff_audit_log (actor_id, created_at desc);

-- Nobody rewrites history: UPDATE, DELETE and TRUNCATE raise, even for the service role.
-- (Only a database owner who drops the trigger first could; that itself is visible.)
create or replace function public.staff_audit_log_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    raise exception 'staff_audit_log is append-only';
end;
$$;

drop trigger if exists staff_audit_log_no_change on public.staff_audit_log;
create trigger staff_audit_log_no_change
    before update or delete on public.staff_audit_log
    for each row execute function public.staff_audit_log_append_only();

drop trigger if exists staff_audit_log_no_truncate on public.staff_audit_log;
create trigger staff_audit_log_no_truncate
    before truncate on public.staff_audit_log
    for each statement execute function public.staff_audit_log_append_only();

-- ── 4. Lock the three tables to the backend only ────────────────────────────────
alter table public.staff_accounts  enable row level security;
alter table public.staff_sessions  enable row level security;
alter table public.staff_audit_log enable row level security;

revoke all on table public.staff_accounts  from anon, authenticated, public;
revoke all on table public.staff_sessions  from anon, authenticated, public;
revoke all on table public.staff_audit_log from anon, authenticated, public;
revoke all on function public.staff_audit_log_append_only() from anon, authenticated, public;

grant select, insert, update, delete on public.staff_accounts  to service_role;
grant select, insert, update, delete on public.staff_sessions  to service_role;
grant select, insert                 on public.staff_audit_log to service_role;

-- ── 5. Who on the team answered / resolved a help message ───────────────────────
-- support_messages.resolved_by points at auth.users, which employees are not.
alter table public.support_replies
    add column if not exists staff_id uuid references public.staff_accounts(id) on delete set null;
alter table public.support_messages
    add column if not exists resolved_by_staff uuid references public.staff_accounts(id) on delete set null;

-- PostgREST picks up the new tables and columns.
notify pgrst, 'reload schema';
