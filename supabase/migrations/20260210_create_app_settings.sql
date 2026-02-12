-- Create app_settings table for global application configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    unlock_all_premium BOOLEAN DEFAULT false NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by TEXT
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read settings (needed for premium check)
CREATE POLICY "Anyone can view app settings"
ON public.app_settings FOR SELECT
USING (true);

-- Policy: Only admins can update settings
CREATE POLICY "Admins can update app settings"
ON public.app_settings FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email')
);

-- Policy: Only admins can insert settings
CREATE POLICY "Admins can insert app settings"
ON public.app_settings FOR INSERT
WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email')
);

-- Insert default settings row (only if table is empty)
INSERT INTO public.app_settings (unlock_all_premium, updated_by)
SELECT false, 'system'
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_app_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    NEW.updated_by = auth.jwt() ->> 'email';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update timestamp
DROP TRIGGER IF EXISTS update_app_settings_timestamp ON public.app_settings;
CREATE TRIGGER update_app_settings_timestamp
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_app_settings_timestamp();
