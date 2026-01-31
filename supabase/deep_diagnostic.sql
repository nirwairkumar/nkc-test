-- DEEP SECURITY DIAGNOSTIC
-- Run this in the Supabase SQL Editor to verify the security state.

BEGIN;

-- 1. Check if RLS is actually ENABLED on the table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'tests';

-- 2. List ALL policies currently active on the 'tests' table
SELECT policyname, cmd, roles, qual::text, with_check::text
FROM pg_policies 
WHERE tablename = 'tests';

-- 3. Verify Distribution of Visibility
SELECT visibility, count(*) as count
FROM public.tests
GROUP BY visibility;

-- 4. SIMULATION: Attempt to read a PRIVATE test as an ANONYMOUS user
-- First, find a private test ID (if any exist)
DO $$
DECLARE
    private_test_id uuid;
    found_title text;
BEGIN
    SELECT id, title INTO private_test_id, found_title FROM public.tests WHERE visibility = 'private' LIMIT 1;
    
    IF private_test_id IS NOT NULL THEN
        RAISE NOTICE 'Found Private Test: % (ID: %)', found_title, private_test_id;
        
        -- Switch to anonymous role (what public users use)
        SET LOCAL ROLE anon;
        
        -- Attempt finding it
        PERFORM * FROM public.tests WHERE id = private_test_id;
        
        IF FOUND THEN
            RAISE EXCEPTION 'CRITICAL SECURITY FAILURE: Anonymous user was able to SELECT a private test!';
        ELSE
            RAISE NOTICE 'SUCCESS: Anonymous user could NOT see the private test.';
        END IF;
    ELSE
        RAISE NOTICE 'No private tests found in database to verify against.';
    END IF;
END $$;

ROLLBACK; -- Rollback changes (like the role switch) so it doesn't affect the session permanently
