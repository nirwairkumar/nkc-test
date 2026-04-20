-- Migration: Add YouTube generation feature flag to app_settings
-- Run this in your Supabase SQL editor

ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS enable_youtube_generation BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS youtube_generation_notes TEXT NOT NULL DEFAULT '';
