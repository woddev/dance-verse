
CREATE OR REPLACE FUNCTION public.generate_track_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  new_slug text;
BEGIN
  -- Generate slug from title
  base_slug := LOWER(REGEXP_REPLACE(
    REGEXP_REPLACE(NEW.title, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  ));
  -- Remove leading/trailing hyphens
  base_slug := TRIM(BOTH '-' FROM base_slug);
  -- Add short unique suffix from id
  new_slug := base_slug || '-' || SUBSTR(NEW.id::text, 1, 4);
  
  -- Only set if slug is null or title changed
  IF TG_OP = 'INSERT' AND NEW.slug IS NULL THEN
    NEW.slug := new_slug;
  ELSIF TG_OP = 'UPDATE' AND OLD.title IS DISTINCT FROM NEW.title THEN
    NEW.slug := new_slug;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_track_slug
  BEFORE INSERT OR UPDATE ON public.tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_track_slug();
