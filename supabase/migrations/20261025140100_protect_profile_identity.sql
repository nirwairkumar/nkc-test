-- Profiles: a signed-in user may edit their own row (policy "Users can update own
-- profile"), but not the columns that other checks trust:
--   * email decides admin status in the backend (admins are listed by email), so a user
--     who set their profile email to an admin's address became an admin;
--   * the verified-creator tick is granted by an admin, never self-set.
-- Found 2026-10-25. No profile had been tampered with (checked before this change).
--
-- Only browser requests (JWT role anon / authenticated) are restricted. The backend
-- (service_role), the sign-up trigger, the SQL editor and admins are unaffected, the same
-- way check_premium_update already guards is_premium / premium_expiry.

create or replace function public.protect_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    jwt_role text := coalesce(auth.jwt() ->> 'role', '');
begin
    if jwt_role not in ('anon', 'authenticated') then
        return new;
    end if;
    if exists (select 1 from public.admins a where a.email = auth.jwt() ->> 'email') then
        return new;
    end if;

    if tg_op = 'INSERT' then
        new.email := nullif(auth.jwt() ->> 'email', '');
        new.is_verified_creator := false;
        new.verified_role := null;
        new.verified_at := null;
        new.verified_by_admin_id := null;
        return new;
    end if;

    if new.email is distinct from old.email
       or new.is_verified_creator is distinct from old.is_verified_creator
       or new.verified_role is distinct from old.verified_role
       or new.verified_at is distinct from old.verified_at
       or new.verified_by_admin_id is distinct from old.verified_by_admin_id then
        raise exception 'These profile fields can only be changed by TestoZa.'
            using errcode = '42501';
    end if;
    return new;
end;
$$;

drop trigger if exists protect_profile_identity on public.profiles;
create trigger protect_profile_identity
    before insert or update on public.profiles
    for each row execute function public.protect_profile_identity();
