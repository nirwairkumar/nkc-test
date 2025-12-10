-- Create a table for admin whitelist
create table public.admins (
  email text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.admins enable row level security;

-- Create policies

-- 1. Allow anyone to READ the admins table (needed so we can check if a user is an admin before they fully access admin routes)
--    Alternatively, we could restrict this to only authenticated users, but if we want to show/hide UI elements based on email input or check 'isAdmin' early, public read is often easiest for whitelists.
--    However, for better privacy, let's limit read to "Authenticated Users" (so you must be logged in to see if you are an admin) 
--    OR just allow the specific user to see if *they* are in the list.
--    Let's go with: "Users can select their own email from the list".
create policy "Users can check their own admin status"
on public.admins for select
using ( auth.jwt() ->> 'email' = email );

-- 2. Allow Service Role (dashboard) full access (implicit, but good to remember)

-- Insert the initial admin
insert into public.admins (email)
values ('learnirwair@gmail.com');
