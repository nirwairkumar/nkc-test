-- Team dashboard: a login ID may also be an email address (owner's choice, 5 Nov 2026).
-- Before: only `priya.s`-style IDs (^[a-z][a-z0-9._-]{2,31}$). Now either that, or a
-- lowercase email up to 100 characters. Safe to run more than once.

alter table public.staff_accounts drop constraint if exists staff_accounts_login_id_check;

alter table public.staff_accounts add constraint staff_accounts_login_id_check check (
    char_length(login_id) <= 100
    and (
        login_id ~ '^[a-z][a-z0-9._-]{2,31}$'
        or login_id ~ '^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$'
    )
);
