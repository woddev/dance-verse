
-- Add email format CHECK constraint (NOT VALID to skip existing rows)
ALTER TABLE public.applications
ADD CONSTRAINT applications_email_format
CHECK (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$') NOT VALID;

-- Add length limits
ALTER TABLE public.applications
ADD CONSTRAINT applications_full_name_length CHECK (char_length(full_name) <= 200) NOT VALID,
ADD CONSTRAINT applications_email_length CHECK (char_length(email) <= 255) NOT VALID,
ADD CONSTRAINT applications_bio_length CHECK (char_length(bio) <= 2000) NOT VALID;
