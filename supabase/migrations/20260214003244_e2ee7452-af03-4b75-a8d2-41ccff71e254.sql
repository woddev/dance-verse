
-- Add accepted_count to campaigns for public visibility of remaining spots
ALTER TABLE public.campaigns ADD COLUMN accepted_count integer NOT NULL DEFAULT 0;

-- Backfill existing counts
UPDATE public.campaigns c
SET accepted_count = (
  SELECT count(*) FROM public.campaign_acceptances ca WHERE ca.campaign_id = c.id
);

-- Trigger function to keep accepted_count in sync
CREATE OR REPLACE FUNCTION public.update_campaign_accepted_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.campaigns SET accepted_count = accepted_count + 1 WHERE id = NEW.campaign_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.campaigns SET accepted_count = accepted_count - 1 WHERE id = OLD.campaign_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_update_accepted_count
AFTER INSERT OR DELETE ON public.campaign_acceptances
FOR EACH ROW
EXECUTE FUNCTION public.update_campaign_accepted_count();
