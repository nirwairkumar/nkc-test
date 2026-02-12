-- Migration to fix profile overwrite on login
-- This changes the trigger function to DO NOTHING if the profile already exists

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, designation, email)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'designation',
    new.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
