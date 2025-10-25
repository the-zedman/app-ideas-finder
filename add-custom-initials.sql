-- Add custom_initials field to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS custom_initials VARCHAR(3);

-- Add comment to explain the field
COMMENT ON COLUMN profiles.custom_initials IS 'User-defined initials to display instead of name-based initials (max 3 characters)';
