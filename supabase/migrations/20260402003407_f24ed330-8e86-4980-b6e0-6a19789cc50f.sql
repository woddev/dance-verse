CREATE OR REPLACE FUNCTION public.auto_complete_expired_campaigns()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE campaigns
  SET status = 'completed'
  WHERE status = 'active'
    AND end_date IS NOT NULL
    AND end_date < CURRENT_DATE;
$$;

SELECT cron.schedule(
  'auto-complete-campaigns',
  '0 1 * * *',
  'SELECT public.auto_complete_expired_campaigns();'
);