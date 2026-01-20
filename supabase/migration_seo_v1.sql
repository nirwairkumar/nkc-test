-- Rename 'sections' to 'categories'
ALTER TABLE sections RENAME TO categories;

-- Rename 'test_sections' to 'test_categories'
ALTER TABLE test_sections RENAME TO test_categories;

-- Rename column 'section_id' to 'category_id' in 'test_categories'
ALTER TABLE test_categories RENAME COLUMN section_id TO category_id;

-- Add 'slug' column to 'tests' table for SEO
ALTER TABLE tests ADD COLUMN slug text UNIQUE;
CREATE INDEX idx_tests_slug ON tests(slug);

-- Verify FK if necessary (Supabase/Postgres usually handles rename of tables fine, but constraints might need checking)
-- If there was a constraint on test_sections referencing sections, it should now reference categories automatically or might need adjustment depending on how it was created.
