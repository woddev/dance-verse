
-- Add slug column to tracks
ALTER TABLE public.tracks ADD COLUMN slug text UNIQUE;

-- Generate slugs for existing tracks
UPDATE public.tracks
SET slug = LOWER(REGEXP_REPLACE(
  REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'),
  '\s+', '-', 'g'
)) || '-' || SUBSTR(id::text, 1, 4);

-- Make slug NOT NULL after backfill
ALTER TABLE public.tracks ALTER COLUMN slug SET NOT NULL;
