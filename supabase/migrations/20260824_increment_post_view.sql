-- Function for atomic post view count increment
CREATE OR REPLACE FUNCTION public.increment_post_view(p_post_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.posts
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_post_id AND status = 'published';
END;
$$;
