-- Demo accounts: fix roles + copy tests from nkchaudhary431@gmail.com
-- Run once in the Supabase SQL editor. Your own tests are only read, never changed.
-- Copies are private (not in the public catalogue) and get fresh IDs (M520 onwards)
-- so their links never clash with the originals.

begin;

-- 1. Roles were swapped; the teacher also needs creator access for My Tests.
update public.profiles set designation = 'Student', updated_at = now()
where email = 'student@testoza.com';

update public.profiles set designation = 'Teacher', is_creator = true, updated_at = now()
where email = 'teacher@testoza.com';

-- 2. Copy tests. Institution gets competitive-exam papers, teacher gets subject tests.
with pick(src_id, owner_email, ord) as (values
    -- Apex Academy Institute (institution@testoza.com)
    ('2c9a7ec6-92b7-424b-9f63-1dd2122f509f'::uuid, 'institution@testoza.com', 1),  -- JEE (Main) 2026 S1 Maths paper
    ('c479e64a-7e2e-4311-b967-9a961fc73dde'::uuid, 'institution@testoza.com', 2),  -- JEE Main 2025 S2 April 8
    ('e9621385-2af6-4989-88d7-690de184d5e6'::uuid, 'institution@testoza.com', 3),  -- JEE Main 2025 22 Jan Shift 1
    ('b605ff93-22f8-4592-9a25-07a34d669725'::uuid, 'institution@testoza.com', 4),  -- NEET-JEE DPP
    ('58711be4-53bf-4f17-a607-082c1d88430c'::uuid, 'institution@testoza.com', 5),  -- RRB Level 01 Stage I
    ('0c151fc5-f336-4a2d-bcd3-019cacc0dd2f'::uuid, 'institution@testoza.com', 6),  -- RRB Group D Chemistry
    ('36e63d0f-be2c-4104-a953-2ee87a1dc277'::uuid, 'institution@testoza.com', 7),  -- SSC GD / UP Police reasoning
    ('90451734-931f-49f1-8d4f-d780b1fcb32a'::uuid, 'institution@testoza.com', 8),  -- JAM 2020 Biotechnology
    ('a6317c44-efd3-4c64-a8ef-97e6cd380b35'::uuid, 'institution@testoza.com', 9),  -- पोषण BPSC
    ('a76703d9-1b10-4ad9-b58a-2fc72e277216'::uuid, 'institution@testoza.com', 10), -- Indian Economy
    ('891ddfbf-50ab-4cac-b320-f685fc03b2b7'::uuid, 'institution@testoza.com', 11), -- Idioms & Phrases
    ('6b02a6cf-2265-4a13-a67a-72b0bec4b9e3'::uuid, 'institution@testoza.com', 12), -- दैनिक समाचार current affairs
    ('6fbd2658-7965-416e-90c9-0af3e07495ab'::uuid, 'institution@testoza.com', 13), -- Daily Current Affairs & GK
    -- Prof. Rajesh Kumar (teacher@testoza.com)
    ('a50bdbdd-0144-4e00-82db-e5342bcddf21'::uuid, 'teacher@testoza.com', 1),      -- JEE (Main) 2026 S1 Mathematics
    ('f704decc-2f76-46c0-8aa0-c3add2cfe4fb'::uuid, 'teacher@testoza.com', 2),      -- Neural Control, Class 11 Biology
    ('252a3b84-7de4-4274-99ab-d2851823207e'::uuid, 'teacher@testoza.com', 3),      -- विद्युत धारा (Electricity)
    ('410a1ac2-711c-4b5b-9a02-c85a87d9f12f'::uuid, 'teacher@testoza.com', 4),      -- English Grammar
    ('a48b6471-b6c0-48d3-851d-041e776b0619'::uuid, 'teacher@testoza.com', 5),      -- C Programming
    ('39dcafbe-6ca8-4a35-aa37-cf047a65e5bf'::uuid, 'teacher@testoza.com', 6),      -- Banker's Algorithm
    ('59e46565-c2ce-47f4-a7e7-7c811ba18e04'::uuid, 'teacher@testoza.com', 7),      -- Compiler Design
    ('98659227-2dca-4509-899d-d46bfc8b45e3'::uuid, 'teacher@testoza.com', 8),      -- Three Phase Inverter
    ('fa859128-90de-4c6f-b96b-40310122a7d9'::uuid, 'teacher@testoza.com', 9),      -- Cement testing
    ('b23d59db-2074-4268-8d82-3a47b5682217'::uuid, 'teacher@testoza.com', 10),     -- Concrete admixtures
    ('a111965b-a8e6-42c9-94dc-d9811e8b798e'::uuid, 'teacher@testoza.com', 11),     -- Intersections & Traffic Control
    ('903a650d-2d0b-4180-8d35-7c222608269e'::uuid, 'teacher@testoza.com', 12),     -- Principles of Traffic Flow
    ('8ee64aee-a019-44f8-98d0-630aa96b8faa'::uuid, 'teacher@testoza.com', 13)      -- Driver, Vehicle & Roadway
),
base as (
    select coalesce(max(substring(custom_id from '^M(\d+)$')::int), 0) as n from public.tests
),
src as (
    select t.*, p.id as owner_id, p.full_name as owner_name, k.owner_email,
           row_number() over (order by k.owner_email, k.ord) as rn
    from pick k
    join public.tests t on t.id = k.src_id
    join public.profiles p on p.email = k.owner_email
    -- Safe to re-run: skip anything this owner already has under the same title.
    where not exists (
        select 1 from public.tests d
        where d.created_by = p.id
          and d.title = regexp_replace(btrim(t.title), '^Copy of ', '')
    )
)
insert into public.tests (
    title, description, created_by, created_at, questions, custom_id, slug,
    duration, revision_notes, is_public, visibility, creator_name, creator_avatar,
    institution_name, institution_logo, institution_color, institution_font,
    settings, tags, custom_category, enable_section_mode, has_scientific_calculator,
    sections, section_marking_model, solutions, merged_sections, sections_metadata
)
select
    regexp_replace(btrim(s.title), '^Copy of ', ''),
    s.description, s.owner_id, s.created_at, s.questions,
    'M' || (b.n + s.rn), 'unlisted-M' || (b.n + s.rn),
    s.duration, s.revision_notes, false, 'private', s.owner_name, null,
    case when s.owner_email = 'institution@testoza.com' then s.owner_name else '' end,
    null, s.institution_color, s.institution_font,
    s.settings, s.tags, s.custom_category, s.enable_section_mode, s.has_scientific_calculator,
    s.sections, s.section_marking_model, s.solutions, s.merged_sections, s.sections_metadata
from src s cross join base b;

commit;

-- 3. Check: expect Student / Teacher (creator) / Institution, and 13 tests each for teacher + institution.
select p.email, p.designation, p.is_creator,
       (select count(*) from public.tests t where t.created_by = p.id) as tests
from public.profiles p
where p.email like '%@testoza.com'
order by p.email;
