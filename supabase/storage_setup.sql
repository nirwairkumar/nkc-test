-- Create the 'avatars' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
-- Set up RLS policies for the 'avatars' bucket
-- 1. Allow public access to view files (SELECT)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );
-- 2. Allow authenticated users to upload files (INSERT)
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);
-- 3. Allow users to update their own files (UPDATE)
-- This is a bit advanced because we need to know ownership. 
-- For simplicity, if we name files with user ID prefix, we could check that.
-- Or just rely on standard insert for new avatars.
-- 4. Allow users to delete their own files (optional, good cleanup)
-- CREATE POLICY "Users can delete own avatars" ...