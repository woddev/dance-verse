
-- Drop old admin_deal_overview to change return type
DROP FUNCTION IF EXISTS public.admin_deal_overview(uuid);

-- Recreate with additional columns
CREATE OR REPLACE FUNCTION public.admin_deal_overview(p_user_id uuid)
RETURNS TABLE(
  total_tracks bigint,
  tracks_under_review bigint,
  active_deals bigint,
  total_revenue numeric,
  pending_payout_liability numeric,
  approval_rate numeric,
  counter_offers_received bigint,
  contracts_awaiting_countersign bigint,
  tracks_submitted bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $function$
DECLARE v_total_submitted NUMERIC; v_total_approved NUMERIC;
BEGIN
  IF NOT public.is_deal_viewer(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  SELECT count(*) INTO v_total_submitted FROM deals.tracks WHERE status NOT IN ('draft');
  SELECT count(*) INTO v_total_approved FROM deals.tracks WHERE status IN ('offer_pending','offer_sent','counter_received','deal_signed','active','expired','terminated');
  RETURN QUERY SELECT
    (SELECT count(*) FROM deals.tracks)::BIGINT,
    (SELECT count(*) FROM deals.tracks WHERE status = 'under_review')::BIGINT,
    (SELECT count(*) FROM deals.tracks WHERE status = 'active')::BIGINT,
    COALESCE((SELECT sum(gross_revenue) FROM deals.revenue_events), 0)::NUMERIC,
    COALESCE((SELECT sum(rd.producer_amount) FROM deals.revenue_distributions rd WHERE rd.payout_status != 'completed'), 0)::NUMERIC,
    CASE WHEN v_total_submitted = 0 THEN 0 ELSE ROUND(v_total_approved * 100.0 / v_total_submitted, 1) END,
    (SELECT count(*) FROM deals.offers WHERE status = 'draft' AND created_by IN (SELECT user_id FROM deals.producers))::BIGINT,
    (SELECT count(*) FROM deals.contracts WHERE status = 'signed_by_producer')::BIGINT,
    (SELECT count(*) FROM deals.tracks WHERE status = 'submitted')::BIGINT;
END;
$function$;
