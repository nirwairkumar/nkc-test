-- Create materials table
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    type TEXT CHECK (type IN ('file', 'link')) NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    file_path TEXT -- Optional path for storage files to help with deletion
);

-- Enable RLS
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Policies for Table
CREATE POLICY "Public Read Access" 
ON public.materials FOR SELECT 
USING (true); -- Publicly viewable materials (as per user intent for simple sharing)

CREATE POLICY "Creator Full Access" 
ON public.materials FOR ALL 
USING (auth.uid() = user_id);

-- Storage Setup (Using a bucket named 'materials')
-- Note: Creating buckets via SQL in Supabase is done via inserting into storage.buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- 1. Public Read
CREATE POLICY "Public Access Materials"
ON storage.objects FOR SELECT
USING ( bucket_id = 'materials' );

-- 2. Creator Upload
CREATE POLICY "Creator Upload Materials"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'materials' AND auth.uid() = owner );

-- 3. Creator Update/Delete
CREATE POLICY "Creator Delete Materials"
ON storage.objects FOR DELETE
USING ( bucket_id = 'materials' AND auth.uid() = owner );
