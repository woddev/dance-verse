
-- Add 'partner' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';

-- Add terms_accepted_at to partners table
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT NULL;
