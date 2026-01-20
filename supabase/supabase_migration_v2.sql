-- Migration for Test Security and Result V2

-- 1. Create Immutable Test Registrations Table (for Attempt Limits)
create table if not exists public.test_registrations (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  test_id uuid not null references public.tests (id) on delete cascade,
  constraint test_registrations_pkey primary key (id),
  constraint test_registrations_user_id_test_id_key unique (user_id, test_id)
);

-- RLS Policies for test_registrations
alter table public.test_registrations enable row level security;

create policy "Users can view their own registrations" on public.test_registrations
  for select using (auth.uid() = user_id);

create policy "Users can insert their own registrations" on public.test_registrations
  for insert with check (auth.uid() = user_id);

create policy "Test creators can view registrations for their tests" on public.test_registrations
  for select using (
    exists (
      select 1 from public.tests
      where tests.id = test_registrations.test_id
      and tests.created_by = auth.uid()
    )
  );

-- IMPORTANT: No DELETE policy for normal users to prevent attempt reset loophole.

-- 2. Add Metadata to User Tests (for Detailed Result Collection)
alter table public.user_tests 
add column if not exists metadata jsonb default '{}'::jsonb;
