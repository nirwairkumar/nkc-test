-- Add premium status columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_expiry TIMESTAMPTZ;

-- Secure the columns: ensure regular users cannot update them directly via RLS
-- Existing RLS allows users to update their own profile. We need to be careful.
-- We can create a trigger or use column-level privileges if we were stricter, 
-- but for now, we will trust the Edge Function (service_role) to update these, 
-- and we should ideally RESTRICT user updates to these columns.

-- However, Supabase Simple RLS usually applies to the whole row for UPDATE.
-- To prevent users from faking premium, we should check if is_premium is being changed in the UPDATE policy.
-- But the existing policy is: USING (auth.uid() = id); which allows ALL updates.

-- Ideally, we should Revoke UPDATE on is_premium for authenticated users, 
-- or split the update policy. 
-- Since altering policies is complex/risky without full context, 
-- we will use a Trigger to prevent unauthorized changes to is_premium.

CREATE OR REPLACE FUNCTION public.prevent_premium_update()
RETURNS TRIGGER AS $$
BEGIN
    -- If the user is trying to change is_premium or premium_expiry
    -- and they are NOT a service_role (superuser/admin), reject it.
    -- (auth.role() returns 'authenticated' for normal users, 'service_role' for edge functions)
    
    IF (NEW.is_premium IS DISTINCT FROM OLD.is_premium OR NEW.premium_expiry IS DISTINCT FROM OLD.premium_expiry) 
       AND (auth.jwt() ->> 'role') != 'service_role' THEN
        RAISE EXCEPTION 'You are not authorized to update premium status directly.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_premium_update ON public.profiles;

CREATE TRIGGER check_premium_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_premium_update();
