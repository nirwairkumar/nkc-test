-- Migration to fix designation storage in profiles
-- This adds the designation column and updates the handle_new_user() trigger function

-- Step 1: Add designation column to profiles table if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS designation TEXT;

-- Step 2: Update the trigger function to include designation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, designation)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'designation'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
