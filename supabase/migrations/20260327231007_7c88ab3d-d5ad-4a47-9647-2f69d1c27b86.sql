CREATE OR REPLACE FUNCTION public.producer_daily_submission_count(p_user_id uuid, p_since timestamptz)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, deals
AS $$
  SELECT count(*)::integer
  FROM deals.tracks dt
  JOIN deals.producers p ON p.id = dt.producer_id
  WHERE p.user_id = p_user_id
    AND dt.created_at >= p_since;
$$;