-- Enable RLS on the table
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 1. Allow Public Read Access (Anyone can see categories)
CREATE POLICY "Public can view categories"
ON public.categories
FOR SELECT
TO public
USING (true);

-- 2. Allow Admin Write Access (Only users in admins table can insert/update/delete)
-- This assumes you have a 'public.admins' table with an 'email' column.
CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE public.admins.email = (auth.jwt() ->> 'email')
  )
);
