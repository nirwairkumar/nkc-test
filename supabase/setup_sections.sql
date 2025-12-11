-- 1. Create sections table
create table if not exists public.sections (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create junction table for many-to-many relationship (Tests <-> Sections)
create table if not exists public.test_sections (
  test_id uuid references public.tests(id) on delete cascade not null,
  section_id uuid references public.sections(id) on delete cascade not null,
  primary key (test_id, section_id)
);

-- 3. Enable Row Level Security (RLS)
alter table public.sections enable row level security;
alter table public.test_sections enable row level security;

-- 4. Create Policies (Adjusting for typical public read, admin write)
-- Note: Check if you need authentication. These are open for read.

-- Policy for Sections
create policy "Sections are viewable by everyone." 
on public.sections for select using (true);

create policy "Admins can insert sections." 
on public.sections for insert with check (true); 
-- IMPORTANT: Add auth logic here if you want to restrict to only admins, e.g., 
-- using (auth.role() = 'service_role') or checking a profile table. 
-- For now, letting 'true' allows anyone to insert if they have the API key, 
-- but usually you handle this with your 'isAdmin' logic in the app or a specific rule.

-- Policy for Test Sections
create policy "Test Sections are viewable by everyone." 
on public.test_sections for select using (true);

create policy "Admins can insert test_sections." 
on public.test_sections for insert with check (true);
