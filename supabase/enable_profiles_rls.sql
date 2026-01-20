-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- DROP POLICIES IF THEY EXIST (To avoid "policy already exists" errors)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- 1. Public Read Access
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles
FOR SELECT
TO public
USING (true);

-- 2. Self Insert (Onboarding)
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 3. Self Update (Profile Management)
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);
