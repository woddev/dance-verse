
-- Add new roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance_admin';

-- Add denial_reason to deals.tracks
ALTER TABLE deals.tracks ADD COLUMN IF NOT EXISTS denial_reason TEXT;

-- Add override_reason to state history tables
ALTER TABLE deals.track_state_history ADD COLUMN IF NOT EXISTS override_reason TEXT;
ALTER TABLE deals.offer_state_history ADD COLUMN IF NOT EXISTS override_reason TEXT;
