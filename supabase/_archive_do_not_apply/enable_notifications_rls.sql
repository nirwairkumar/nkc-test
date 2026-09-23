-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. Allow Public Insert (Anyone can send a notification to anyone)
-- E.g. A student sending feedback notifies the creator.
CREATE POLICY "Public can insert notifications"
ON public.notifications
FOR INSERT
TO public
WITH CHECK (true);

-- 2. Allow Users to View their OWN notifications only
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Allow Users to Update their OWN notifications (e.g. mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Allow Users to Delete their OWN notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
