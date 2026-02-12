
-- Add draft to campaign_status enum
ALTER TYPE public.campaign_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'active';

-- Add start and end date columns
ALTER TABLE public.campaigns
ADD COLUMN start_date date,
ADD COLUMN end_date date;
