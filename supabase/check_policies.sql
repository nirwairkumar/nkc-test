-- DIAGNOSTIC SCRIPT
-- Lists all policies on the 'tests' table to check for conflicts or loopholes.

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'tests';
