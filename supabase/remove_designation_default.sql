-- Remove the default value 'Student' from the designation column
-- This ensures that Google Sign-In (or other providers) results in a NULL value
-- instead of automatically defaulting to 'Student'.
ALTER TABLE profiles 
ALTER COLUMN designation DROP DEFAULT;
-- Ensure the column allows NULL values (it usually does by default, but good to be sure)
ALTER TABLE profiles 
ALTER COLUMN designation DROP NOT NULL;