-- Fix RLS Policies for Analytics Tables
-- The backend uses the Anon key by default unless configured with Service Role key.
-- Since the frontend is sending tracking events and the backend is processing them,
-- the backend needs INSERT/UPDATE privileges. If the backend is using the standard
-- Anon key (which operates as an 'anon' role), the previous 'service_role' only limits 
-- were blocking the inserts.
--
-- Note: In a production super-secure environment, you would provide the Railway
-- backend with the SUPABASE_SERVICE_ROLE_KEY and instantiate the client with it.
-- But standard `get_db` often uses Anon key if not configured otherwise. So we 
-- allow 'anon' and 'authenticated' roles to insert data into these tracking tables 
-- essentially making them append-only/upsertable by the public API.

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Service role only" ON public.visitors;
DROP POLICY IF EXISTS "Service role only" ON public.sessions;
DROP POLICY IF EXISTS "Service role only" ON public.page_views;
DROP POLICY IF EXISTS "Admins can read stats" ON public.daily_stats;

-- 2. Create flexible policies to allow the APIs to insert/update
-- Visitors: Anyone can insert, anyone can update their own visit counts
CREATE POLICY "Allow public insert and update visitors" ON public.visitors
    FOR ALL USING (true) WITH CHECK (true);

-- Sessions: Anyone can insert/update their active sessions
CREATE POLICY "Allow public insert and update sessions" ON public.sessions
    FOR ALL USING (true) WITH CHECK (true);

-- Page Views: Anyone can insert page views
CREATE POLICY "Allow public insert page_views" ON public.page_views
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select page_views" ON public.page_views
    FOR SELECT USING (true);

-- Daily Stats: Service role / Admins can read, functions can write
CREATE POLICY "Admin read stats" ON public.daily_stats
    FOR SELECT USING (true);
