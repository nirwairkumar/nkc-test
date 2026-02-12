-- Add verification fields to profiles table if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_verified_creator BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verified_role TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_by_admin_id UUID REFERENCES auth.users(id);

-- Add comment
COMMENT ON COLUMN public.profiles.is_verified_creator IS 'Start true if user is a verified creator';
