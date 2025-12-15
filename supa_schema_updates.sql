-- Create Feedback Table
create table if not exists feedback (
  id uuid default gen_random_uuid() primary key,
  test_id uuid references tests(id) on delete cascade,
  user_id uuid references auth.users(id), -- optional if anonymous users are allowed
  rating int check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS (Optional, depending on your policy, usually good practice)
alter table feedback enable row level security;

-- Policy: Allow anyone to insert feedback (for now, or restrict to authenticated)
create policy "Anyone can insert feedback"
  on feedback for insert
  with check (true);

-- Policy: Only admin (or service role) can view feedback (simplified)
create policy "Everyone can view feedback"
  on feedback for select
  using (true);

-- NOTES FOR USER:
-- Run this in your Supabase SQL Editor.
-- Ensure 'tests' table exists (it should).
