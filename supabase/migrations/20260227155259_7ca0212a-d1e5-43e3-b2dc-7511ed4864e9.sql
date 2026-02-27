
-- Add recoupment to deal_type enum and remove hybrid
ALTER TYPE deals.deal_type ADD VALUE IF NOT EXISTS 'recoupment';

-- Add marketing_budget and recoupment_balance columns to offers
ALTER TABLE deals.offers ADD COLUMN IF NOT EXISTS marketing_budget NUMERIC DEFAULT NULL;
ALTER TABLE deals.offers ADD COLUMN IF NOT EXISTS recoupment_balance NUMERIC DEFAULT NULL;
