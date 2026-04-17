-- Add feature flag for anonymous tests
ALTER TABLE public.app_settings 
ADD COLUMN enable_anonymous_tests BOOLEAN DEFAULT false;

-- Add a comment explaining what this is for
COMMENT ON COLUMN public.app_settings.enable_anonymous_tests IS 'Controls whether the "Continue Anonymously" button is visible to guests on the test intro page.';
