-- Create a table for Test Likes
create table if not exists test_likes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  test_id uuid references tests(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_like unique(user_id, test_id)
);

-- Enable RLS
alter table test_likes enable row level security;

-- Policies for test_likes
create policy "Users can view all likes"
  on test_likes for select
  using ( true );

create policy "Authenticated users can toggle likes"
  on test_likes for insert
  with check ( auth.uid() = user_id );

create policy "Users can remove their own likes"
  on test_likes for delete
  using ( auth.uid() = user_id );


-- Ensure Sections Support (in case not fully set up)
create table if not exists sections (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Many-to-Many relationship for Tests <-> Sections
create table if not exists test_sections (
  test_id uuid references tests(id) on delete cascade,
  section_id uuid references sections(id) on delete cascade,
  primary key (test_id, section_id)
);

alter table sections enable row level security;
alter table test_sections enable row level security;

-- Section Policies
create policy "Anyone can view sections"
  on sections for select
  using ( true );

create policy "Authenticated users can create sections"
  on sections for insert
  with check ( auth.role() = 'authenticated' );

-- Test Section Policies
create policy "Anyone can view test sections"
  on test_sections for select
  using ( true );

create policy "Users can manage sections for their own tests"
  on test_sections for all
  using ( 
    exists (
      select 1 from tests 
      where tests.id = test_sections.test_id 
      and tests.created_by = auth.uid()
    )
  );
