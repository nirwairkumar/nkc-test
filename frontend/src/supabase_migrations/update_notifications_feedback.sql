-- Add columns for detailed feedback tracking in notifications
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS custom_test_id TEXT,
ADD COLUMN IF NOT EXISTS sender_name TEXT,
ADD COLUMN IF NOT EXISTS sender_email TEXT;
