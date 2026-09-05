-- Migration: Remove up/down test voting system
-- Date: 2026-09-04

-- Drop test_votes table and its constraints/policies
DROP TABLE IF EXISTS public.test_votes CASCADE;
