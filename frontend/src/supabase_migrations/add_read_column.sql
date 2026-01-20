-- Add 'read' column if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notifications'
        AND column_name = 'read'
    ) THEN
        ALTER TABLE public.notifications
        ADD COLUMN read BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
