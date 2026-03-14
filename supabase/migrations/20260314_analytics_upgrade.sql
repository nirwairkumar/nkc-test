-- Upgrading test_registrations for industry-grade analytics
ALTER TABLE public.test_registrations
ADD COLUMN IF NOT EXISTS status text DEFAULT 'in_progress',
ADD COLUMN IF NOT EXISTS completion_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS abandoned_reason text,
ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone DEFAULT now();

-- Update existing rows so they aren't null or confusing
UPDATE public.test_registrations 
SET status = 'submitted', completion_percentage = 100
WHERE id IN (
    -- Any registration that already has a corresponding submitted user_tests row gets marked as submitted
    SELECT tr.id 
    FROM public.test_registrations tr
    JOIN public.user_tests ut ON tr.test_id = ut.test_id AND tr.user_id = ut.user_id
);

-- Mark the rest as abandoned since they were started in the past and not submitted
UPDATE public.test_registrations
SET status = 'abandoned', abandoned_reason = 'legacy_abandoned'
WHERE status = 'in_progress' AND started_at < now() - interval '1 day';
