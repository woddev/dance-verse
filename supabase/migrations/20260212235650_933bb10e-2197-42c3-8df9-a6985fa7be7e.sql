
-- Add slug column
ALTER TABLE public.campaigns ADD COLUMN slug text UNIQUE;

-- Generate slugs from existing titles
UPDATE public.campaigns SET slug = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || substring(id::text from 1 for 8);

-- Make slug NOT NULL after populating
ALTER TABLE public.campaigns ALTER COLUMN slug SET NOT NULL;

-- Index for fast lookups
CREATE INDEX idx_campaigns_slug ON public.campaigns(slug);
