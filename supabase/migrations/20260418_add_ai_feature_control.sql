-- Add feature flag for AI test generation
ALTER TABLE public.app_settings 
ADD COLUMN enable_ai_test_generation BOOLEAN DEFAULT true,
ADD COLUMN ai_test_generation_notes TEXT DEFAULT '';

-- Add a comment explaining what this is for
COMMENT ON COLUMN public.app_settings.enable_ai_test_generation IS 'Controls whether the AI test importer feature is accessible.';
COMMENT ON COLUMN public.app_settings.ai_test_generation_notes IS 'Notes to display to users when AI test generation is disabled.';
