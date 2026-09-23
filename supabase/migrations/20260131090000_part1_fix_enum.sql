-- Part 1: test_visibility enum.
-- ALTER TYPE ... ADD VALUE cannot run in the same transaction as statements that use the
-- new value, so this is split from part2 (which adds the column and backfills it).
--
-- Live values verified 2026-09-20 via pg_enum: public, link_only, private, unlisted
-- ('link_only' was added directly in the SQL editor and is used by the live tests policy
--  "Allow public read access to non-private tests").
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_visibility') THEN
        CREATE TYPE test_visibility AS ENUM ('public', 'private', 'unlisted', 'link_only');
    END IF;
END $$;

ALTER TYPE test_visibility ADD VALUE IF NOT EXISTS 'unlisted';
ALTER TYPE test_visibility ADD VALUE IF NOT EXISTS 'link_only';
