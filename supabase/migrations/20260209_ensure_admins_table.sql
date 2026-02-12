-- Create admins table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert admin email if not exists
INSERT INTO public.admins (email)
VALUES ('learnirwair@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Add comment
COMMENT ON TABLE public.admins IS 'Table storing admin user emails for authorization checks';
