
-- Create application_status enum
CREATE TYPE public.application_status AS ENUM ('none', 'pending', 'approved', 'rejected');

-- Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN dance_style text,
  ADD COLUMN years_experience integer,
  ADD COLUMN location text,
  ADD COLUMN application_status application_status NOT NULL DEFAULT 'none',
  ADD COLUMN application_submitted_at timestamptz,
  ADD COLUMN application_reviewed_at timestamptz,
  ADD COLUMN rejection_reason text;
