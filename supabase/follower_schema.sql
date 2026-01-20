-- 1. Updates to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_creator BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS following_visibility TEXT CHECK (following_visibility IN ('public', 'private')) DEFAULT 'public';

-- 2. Create follows table
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (follower_id, following_id)
);

-- 3. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable RLS (Row Level Security) - Optional but recommended
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for follows
CREATE POLICY "Public follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can create their own follows" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can delete their own follows" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
-- (Insert policy would depend on who triggers it, likely server-side or via specific function, leaving open for now or allowing authenticated users to insert if client-side logic used for testing)
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated'); 
