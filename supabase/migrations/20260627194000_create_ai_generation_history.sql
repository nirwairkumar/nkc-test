-- Create AI Generation History Table
CREATE TABLE IF NOT EXISTS public.ai_generation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('extract', 'generate')),
    title TEXT,
    description TEXT,
    file_name TEXT,
    question_count INTEGER NOT NULL DEFAULT 0,
    parsed_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.ai_generation_history ENABLE ROW LEVEL SECURITY;

-- Create indices
CREATE INDEX IF NOT EXISTS idx_ai_history_user_id ON public.ai_generation_history(user_id, created_at DESC);

-- RLS Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'ai_generation_history' AND policyname = 'Users can view their own AI history'
    ) THEN
        CREATE POLICY "Users can view their own AI history" 
            ON public.ai_generation_history FOR SELECT 
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'ai_generation_history' AND policyname = 'Users can insert their own AI history'
    ) THEN
        CREATE POLICY "Users can insert their own AI history" 
            ON public.ai_generation_history FOR INSERT 
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'ai_generation_history' AND policyname = 'Users can delete their own AI history'
    ) THEN
        CREATE POLICY "Users can delete their own AI history" 
            ON public.ai_generation_history FOR DELETE 
            USING (auth.uid() = user_id);
    END IF;
END $$;
