-- Migration to add News & Updates control to app_settings

-- Add columns for News and Updates feature toggle
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS enable_news_updates BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS news_updates_notes TEXT;

-- Note: Ensure that your Supabase instance allows these columns to be fetched and updated.
