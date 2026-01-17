-- Add columns for detailed tracking in feedback table
ALTER TABLE public.feedback
ADD COLUMN IF NOT EXISTS sender_name TEXT,
ADD COLUMN IF NOT EXISTS sender_email TEXT,
ADD COLUMN IF NOT EXISTS receiver_name TEXT,
ADD COLUMN IF NOT EXISTS receiver_email TEXT,
ADD COLUMN IF NOT EXISTS custom_test_id TEXT;
