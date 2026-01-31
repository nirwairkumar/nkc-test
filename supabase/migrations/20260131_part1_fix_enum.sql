-- PART 1: ENUM SETUP
-- Best Practice: Isolate Enum changes in their own transaction/script.
-- Run this script FIRST and ensure it succeeds before running the table update.

DO $$ 
BEGIN
    -- 1. Create the enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_visibility') THEN
        CREATE TYPE test_visibility AS ENUM ('public', 'private', 'unlisted');
    ELSE
        -- 2. If it exists, ensure 'unlisted' value is present
        -- Note: We cannot run ALTER TYPE inside a DO block easily for ADD VALUE in all versions without commit.
        -- But since we are likely not in a transaction block here if run individually, we try to catch it.
        -- Ideally, just run the ALTER TYPE line below outside this block if you know it exists.
        NULL;
    END IF;
END $$;

-- Try to add the value if it might be missing (Postgres ignores if exists if using IF NOT EXISTS logic manually or via error suppression)
-- But standard SQL doesn't have "ADD VALUE IF NOT EXISTS" for Enums in older versions nicely. 
-- The cleanest way in a migration script is often:
ALTER TYPE test_visibility ADD VALUE IF NOT EXISTS 'unlisted';
