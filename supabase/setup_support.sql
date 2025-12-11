create table if not exists public.support_messages (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  phone text,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.support_messages enable row level security;

-- Allow anyone to insert (public support form)
create policy "Anyone can insert support messages" 
on public.support_messages for insert with check (true);
