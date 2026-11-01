-- Move base64 pictures out of tests into Storage (2026-10-25).
--
-- On 2026-10-25, 45 tests held 1,186 base64 pictures (593 different ones), 38 of the 47 MB
-- of question data, and 31 tests held a base64 institution logo. Every candidate downloads
-- the whole test, so the largest one was 6.4 MB. The backend now uploads pictures on save
-- (app/services/question_images.py); backend/scripts/move_inline_images.py uses the
-- functions below to do the same to tests saved before that.
--
-- Nothing is lost: each test's old questions / sections / logo are copied to
-- tests_image_backup in the same transaction that replaces them, and
-- restore_test_inline_images() puts them back. Running this file changes no test.

-- One fingerprint of the three columns, so "has this test changed?" is one comparison.
create or replace function public.test_image_fingerprint(q jsonb, s jsonb, logo text)
returns text
language sql
immutable
as $$
    select md5(coalesce(q::text, '') || '|' || coalesce(s::text, '') || '|' || coalesce(logo, ''))
$$;

-- The old values, one row per moved test. Holds answer keys, so no browser role can read it.
create table if not exists public.tests_image_backup (
    test_id          uuid primary key references public.tests (id) on delete cascade,
    questions        jsonb,
    sections         jsonb,
    institution_logo text,
    original_fp      text not null,
    migrated_fp      text,
    backed_up_at     timestamptz not null default now(),
    migrated_at      timestamptz
);
alter table public.tests_image_backup enable row level security;
revoke all on public.tests_image_backup from anon, authenticated;

-- Tests that still hold a base64 picture, smallest first.
create or replace function public.tests_with_inline_images()
returns table (id uuid, fingerprint text, bytes bigint)
language sql
stable
set search_path = public
as $$
    select t.id,
           public.test_image_fingerprint(t.questions, t.sections, t.institution_logo),
           coalesce(pg_column_size(t.questions), 0) + coalesce(pg_column_size(t.sections), 0)
             + coalesce(pg_column_size(t.institution_logo), 0)
    from public.tests t
    where t.questions::text like '%data:image/%'
       or t.sections::text like '%data:image/%'
       or t.institution_logo like 'data:image/%'
    order by 3
$$;

-- Back up and replace one test, but only if it is exactly as it was when the script read
-- it ('changed' otherwise: a teacher saving at that moment is never overwritten).
create or replace function public.swap_test_inline_images(
    p_id uuid, p_fingerprint text, p_questions jsonb, p_sections jsonb, p_logo text
)
returns text
language plpgsql
set search_path = public
as $$
declare
    cur public.tests%rowtype;
begin
    select * into cur from public.tests where id = p_id for update;
    if not found then
        return 'missing';
    end if;
    if public.test_image_fingerprint(cur.questions, cur.sections, cur.institution_logo) <> p_fingerprint then
        return 'changed';
    end if;

    insert into public.tests_image_backup (test_id, questions, sections, institution_logo, original_fp)
    values (cur.id, cur.questions, cur.sections, cur.institution_logo, p_fingerprint)
    on conflict (test_id) do update
        set questions = excluded.questions,
            sections = excluded.sections,
            institution_logo = excluded.institution_logo,
            original_fp = excluded.original_fp,
            backed_up_at = now();

    update public.tests
       set questions = p_questions, sections = p_sections, institution_logo = p_logo
     where id = p_id;

    update public.tests_image_backup b
       set migrated_fp = public.test_image_fingerprint(t.questions, t.sections, t.institution_logo),
           migrated_at = now()
      from public.tests t
     where t.id = p_id and b.test_id = p_id;
    return 'moved';
end;
$$;

-- Undo for one test: put the backed-up values back, unless the test was edited after the
-- move ('edited since': the teacher's newer version is kept).
--   select test_id, public.restore_test_inline_images(test_id) from public.tests_image_backup;
create or replace function public.restore_test_inline_images(p_id uuid)
returns text
language plpgsql
set search_path = public
as $$
declare
    b public.tests_image_backup%rowtype;
    cur_fp text;
begin
    select * into b from public.tests_image_backup where test_id = p_id;
    if not found then
        return 'no backup';
    end if;
    select public.test_image_fingerprint(questions, sections, institution_logo) into cur_fp
      from public.tests where id = p_id for update;
    if not found then
        return 'missing';
    end if;
    if b.migrated_fp is null or cur_fp is distinct from b.migrated_fp then
        return 'edited since';
    end if;
    update public.tests
       set questions = b.questions, sections = b.sections, institution_logo = b.institution_logo
     where id = p_id;
    return 'restored';
end;
$$;

-- Only the backend's service role may run these.
revoke all on function public.tests_with_inline_images() from public, anon, authenticated;
revoke all on function public.swap_test_inline_images(uuid, text, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function public.restore_test_inline_images(uuid) from public, anon, authenticated;
grant execute on function public.tests_with_inline_images() to service_role;
grant execute on function public.swap_test_inline_images(uuid, text, jsonb, jsonb, text) to service_role;
grant execute on function public.restore_test_inline_images(uuid) to service_role;
