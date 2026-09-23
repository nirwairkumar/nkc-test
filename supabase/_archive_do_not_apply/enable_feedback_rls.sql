-- Enable RLS on the table
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 1. Allow Public Insert (Anyone can submit feedback)
CREATE POLICY "Public can submit feedback"
ON public.feedback
FOR INSERT
TO public
WITH CHECK (true);

-- 2. Allow Admins to View All Feedback
CREATE POLICY "Admins can view all feedback"
ON public.feedback
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE public.admins.email = (auth.jwt() ->> 'email')
  )
);

-- 3. Allow Users to View Feedback they sent or received (Optional, good for creators)
CREATE POLICY "Users can view own feedback"
ON public.feedback
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'email') = sender_email 
  OR 
  (auth.jwt() ->> 'email') = receiver_email
);
