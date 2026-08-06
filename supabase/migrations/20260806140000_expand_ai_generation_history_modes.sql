-- Expand AI Generation History Modes
ALTER TABLE public.ai_generation_history DROP CONSTRAINT IF EXISTS ai_generation_history_mode_check;
ALTER TABLE public.ai_generation_history ADD CONSTRAINT ai_generation_history_mode_check CHECK (mode IN ('extract', 'generate', 'youtube', 'topics'));
