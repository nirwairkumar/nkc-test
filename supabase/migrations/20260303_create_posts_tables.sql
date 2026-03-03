-- Create posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id     UUID NOT NULL REFERENCES auth.users(id),

  -- Content
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  summary       TEXT,
  content       JSONB NOT NULL,
  cover_image   TEXT,

  -- Metadata
  category      TEXT DEFAULT 'general',
  tags          TEXT[] DEFAULT '{}',
  status        TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_pinned     BOOLEAN DEFAULT false,

  -- Engagement
  view_count    INTEGER DEFAULT 0,
  like_count    INTEGER DEFAULT 0,

  -- Timestamps
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_published ON public.posts(published_at DESC);

-- Create post_likes table
CREATE TABLE IF NOT EXISTS public.post_likes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(post_id, user_id)
);

-- RLS setup
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- Posts policies
CREATE POLICY "Public read published posts" 
  ON public.posts FOR SELECT 
  USING (status = 'published');

CREATE POLICY "Authors read own posts" 
  ON public.posts FOR SELECT 
  USING (auth.uid() = author_id);

CREATE POLICY "Verified creators can create posts" 
  ON public.posts FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_verified_creator = true
    ) OR EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.email = (auth.jwt()->>'email')::text
    )
  );

CREATE POLICY "Authors update own posts" 
  ON public.posts FOR UPDATE 
  USING (auth.uid() = author_id);

CREATE POLICY "Authors delete own posts" 
  ON public.posts FOR DELETE 
  USING (auth.uid() = author_id);

-- Likes policies
CREATE POLICY "Public read post likes" 
  ON public.post_likes FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can like" 
  ON public.post_likes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes" 
  ON public.post_likes FOR DELETE 
  USING (auth.uid() = user_id);

-- Storage bucket for post images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-images', 'post-images', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage policies for post-images
CREATE POLICY "Public Access for post images" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users can upload post images" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'post-images' 
    AND auth.role() = 'authenticated'
  );
