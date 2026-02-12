-- Consolidated Fix for Materials (Table, Columns, Constraints, Storage)

-- 1. Ensure Materials Table Exists
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    file_path TEXT
);

-- 2. Ensure class_id column exists
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

-- 3. Fix Type Constraint to allow 'external'
ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_type_check;
ALTER TABLE public.materials ADD CONSTRAINT materials_type_check 
    CHECK (type IN ('file', 'link', 'external'));

-- 4. Enable RLS
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- 5. Refresh Table Policies
DROP POLICY IF EXISTS "Public Read Access" ON public.materials;
CREATE POLICY "Public Read Access" ON public.materials FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creator Full Access" ON public.materials;
CREATE POLICY "Creator Full Access" ON public.materials FOR ALL USING (auth.uid() = user_id);

-- 6. Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public) 
VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Refresh Storage Policies
DROP POLICY IF EXISTS "Public Access Materials" ON storage.objects;
CREATE POLICY "Public Access Materials" ON storage.objects FOR SELECT USING ( bucket_id = 'materials' );

DROP POLICY IF EXISTS "Creator Upload Materials" ON storage.objects;
CREATE POLICY "Creator Upload Materials" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'materials' AND auth.uid() = owner );

DROP POLICY IF EXISTS "Creator Delete Materials" ON storage.objects;
CREATE POLICY "Creator Delete Materials" ON storage.objects FOR DELETE USING ( bucket_id = 'materials' AND auth.uid() = owner );
