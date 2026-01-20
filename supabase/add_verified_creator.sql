-- Add Verified Creator fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_verified_creator BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_role TEXT CHECK (verified_role IN ('authorized_partner')),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_by_admin_id UUID REFERENCES auth.users(id);

-- Add index for faster querying
CREATE INDEX IF NOT EXISTS idx_is_verified_creator ON public.profiles(is_verified_creator);
