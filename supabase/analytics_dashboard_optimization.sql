-- =====================================================================
-- Migration: Admin Analytics Performance Optimization
-- Author: Antigravity
-- Date: 2026-06-10
-- Purpose:
--   Automatically maintain total_page_views count on the 'visitors' table
--   to allow the admin analytics dashboard to lazy load page views.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Schema Update: Add total_page_views to visitors table
-- ---------------------------------------------------------------------
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS total_page_views integer DEFAULT 0;

-- ---------------------------------------------------------------------
-- 2. Trigger Function to sync total_page_views
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_sync_visitor_page_views_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.visitor_id IS NOT NULL THEN
      UPDATE visitors 
      SET total_page_views = COALESCE(total_page_views, 0) + 1
      WHERE id = NEW.visitor_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.visitor_id IS NOT NULL THEN
      UPDATE visitors 
      SET total_page_views = GREATEST(0, COALESCE(total_page_views, 0) - 1)
      WHERE id = OLD.visitor_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.visitor_id IS DISTINCT FROM NEW.visitor_id THEN
      IF OLD.visitor_id IS NOT NULL THEN
        UPDATE visitors 
        SET total_page_views = GREATEST(0, COALESCE(total_page_views, 0) - 1)
        WHERE id = OLD.visitor_id;
      END IF;
      IF NEW.visitor_id IS NOT NULL THEN
        UPDATE visitors 
        SET total_page_views = COALESCE(total_page_views, 0) + 1
        WHERE id = NEW.visitor_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 3. Create Trigger on page_views table
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_page_views_count_sync ON page_views;
CREATE TRIGGER trg_page_views_count_sync
AFTER INSERT OR UPDATE OR DELETE ON page_views
FOR EACH ROW
EXECUTE FUNCTION trg_sync_visitor_page_views_count();

-- ---------------------------------------------------------------------
-- 4. Data Initialization: Populate count for existing records
-- ---------------------------------------------------------------------
UPDATE visitors v
SET total_page_views = (
  SELECT COALESCE(count(*), 0)
  FROM page_views pv 
  WHERE pv.visitor_id = v.id
);
