-- Create plans table
create table public.plans (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  price integer not null, -- stored in paise (e.g. 1000 = ₹10.00)
  duration_days integer not null,
  features jsonb default '[]'::jsonb,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.plans enable row level security;

-- Policies

-- 1. Public Read Access (Anyone can see active plans)
-- Note: We generally only want users to see 'active' plans.
create policy "Everyone can view active plans"
on public.plans for select
using ( is_active = true );

-- 2. Admin Read Access (Admins can see ALL plans, including inactive ones)
create policy "Admins can view all plans"
on public.plans for select
using (
  exists (select 1 from public.admins where email = auth.jwt() ->> 'email')
);

-- 3. Admin Insert Access
create policy "Admins can insert plans"
on public.plans for insert
with check (
  exists (select 1 from public.admins where email = auth.jwt() ->> 'email')
);

-- 4. Admin Update Access
create policy "Admins can update plans"
on public.plans for update
using (
  exists (select 1 from public.admins where email = auth.jwt() ->> 'email')
);

-- 5. Admin Delete Access (Optional, usually we just set is_active false)
create policy "Admins can delete plans"
on public.plans for delete
using (
  exists (select 1 from public.admins where email = auth.jwt() ->> 'email')
);

-- Insert some default plans to start with
insert into public.plans (name, description, price, duration_days, features, is_active) values
('Monthly Pro', 'Perfect for short term preparation', 49900, 30, '["Unlimited Tests", "Detailed Analytics", "Priority Support"]', true),
('Yearly Elite', 'Best value for serious students', 399900, 365, '["All Monthly Features", "Offline Access", " mentorship calls"]', true);
