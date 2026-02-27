
-- =============================================
-- REVENUE ENGINE & PRODUCER PAYOUT SYSTEM
-- =============================================

-- 1. Add Stripe Connect fields to deals.producers
ALTER TABLE deals.producers
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_onboarded BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Add payout_id to revenue_distributions for linking to payout records
ALTER TABLE deals.revenue_distributions
  ADD COLUMN IF NOT EXISTS payout_id UUID REFERENCES deals.payouts(id),
  ADD COLUMN IF NOT EXISTS distribution_type TEXT NOT NULL DEFAULT 'revenue_split';

-- 3. Add stripe_event_id to payouts for webhook reconciliation
ALTER TABLE deals.payouts
  ADD COLUMN IF NOT EXISTS stripe_event_id TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Create platform_settings table for configurable thresholds
CREATE TABLE IF NOT EXISTS deals.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Insert default minimum payout threshold ($50)
INSERT INTO deals.platform_settings (key, value)
VALUES ('min_payout_threshold_cents', '5000'::JSONB)
ON CONFLICT (key) DO NOTHING;

-- 5. Immutability trigger for revenue_distributions (prevent updates on processed records)
CREATE OR REPLACE FUNCTION deals.prevent_distribution_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'deals'
AS $$
BEGIN
  -- Allow payout_status and payout_id updates (for payout processing)
  IF OLD.payout_status = 'completed' AND NEW.payout_status != OLD.payout_status THEN
    RAISE EXCEPTION 'Cannot modify completed distribution (id: %)', OLD.id;
  END IF;
  -- Block changes to financial amounts
  IF NEW.producer_amount IS DISTINCT FROM OLD.producer_amount OR
     NEW.platform_amount IS DISTINCT FROM OLD.platform_amount OR
     NEW.revenue_event_id IS DISTINCT FROM OLD.revenue_event_id THEN
    RAISE EXCEPTION 'Cannot modify financial fields on distribution (id: %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_distribution_immutability ON deals.revenue_distributions;
CREATE TRIGGER trg_distribution_immutability
  BEFORE UPDATE ON deals.revenue_distributions
  FOR EACH ROW EXECUTE FUNCTION deals.prevent_distribution_update();

-- 6. Auto-distribution trigger on revenue_event insert
CREATE OR REPLACE FUNCTION deals.auto_create_distribution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'deals'
AS $$
DECLARE
  v_offer RECORD;
  v_contract RECORD;
  v_producer_amount NUMERIC(12,2);
  v_platform_amount NUMERIC(12,2);
  v_dist_type TEXT;
BEGIN
  -- Find active contract for this track
  SELECT c.id, c.status, o.deal_type, o.producer_split_percent, o.platform_split_percent,
         o.buyout_amount, o.track_id, t.status AS track_status
  INTO v_offer
  FROM deals.contracts c
  JOIN deals.offers o ON o.id = c.offer_id
  JOIN deals.tracks t ON t.id = o.track_id
  WHERE o.track_id = NEW.track_id
    AND c.status = 'fully_executed'
    AND t.status = 'active'
  ORDER BY c.created_at DESC
  LIMIT 1;

  -- If no active contract, skip distribution (buyout with no ongoing split)
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Check contract term expiry would be done at the application level
  -- since contracts don't have explicit expiry dates in the schema

  IF v_offer.deal_type = 'buyout' THEN
    -- Buyout: platform retains full revenue, no producer distribution
    v_producer_amount := 0;
    v_platform_amount := NEW.net_revenue;
    v_dist_type := 'buyout';
  ELSIF v_offer.deal_type IN ('revenue_split', 'hybrid') THEN
    -- Revenue split: distribute according to contract terms
    v_producer_amount := ROUND(NEW.net_revenue * v_offer.producer_split_percent / 100, 2);
    v_platform_amount := ROUND(NEW.net_revenue * v_offer.platform_split_percent / 100, 2);
    v_dist_type := v_offer.deal_type::TEXT;
  ELSE
    -- Unknown deal type, skip
    RETURN NEW;
  END IF;

  INSERT INTO deals.revenue_distributions (
    revenue_event_id, producer_amount, platform_amount, distribution_type, payout_status
  ) VALUES (
    NEW.id, v_producer_amount, v_platform_amount, v_dist_type, 'pending'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_distribute ON deals.revenue_events;
CREATE TRIGGER trg_auto_distribute
  AFTER INSERT ON deals.revenue_events
  FOR EACH ROW EXECUTE FUNCTION deals.auto_create_distribution();

-- 7. Prevent payouts from being modified once completed
CREATE OR REPLACE FUNCTION deals.prevent_payout_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'deals'
AS $$
BEGIN
  IF OLD.status = 'completed' THEN
    -- Allow only flagged_for_review updates
    IF NEW.flagged_for_review IS DISTINCT FROM OLD.flagged_for_review AND
       NEW.amount IS NOT DISTINCT FROM OLD.amount AND
       NEW.status IS NOT DISTINCT FROM OLD.status AND
       NEW.producer_id IS NOT DISTINCT FROM OLD.producer_id THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Cannot modify completed payout (id: %)', OLD.id;
  END IF;
  -- Block changes to financial amounts on processing payouts
  IF OLD.status = 'processing' AND NEW.amount IS DISTINCT FROM OLD.amount THEN
    RAISE EXCEPTION 'Cannot modify amount on processing payout (id: %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payout_immutability ON deals.payouts;
CREATE TRIGGER trg_payout_immutability
  BEFORE UPDATE ON deals.payouts
  FOR EACH ROW EXECUTE FUNCTION deals.prevent_payout_update();

-- 8. RPC: Process payout queue (for edge function to call)
CREATE OR REPLACE FUNCTION public.process_payout_queue(p_user_id UUID, p_producer_id UUID DEFAULT NULL)
RETURNS TABLE(
  producer_id UUID,
  producer_name TEXT,
  stripe_account_id TEXT,
  total_amount NUMERIC,
  distribution_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
DECLARE
  v_threshold NUMERIC;
BEGIN
  -- Only finance_admin or admin can process payouts
  IF NOT public.is_deal_admin(p_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get minimum payout threshold
  SELECT (value::TEXT)::NUMERIC INTO v_threshold
  FROM deals.platform_settings WHERE key = 'min_payout_threshold_cents';
  v_threshold := COALESCE(v_threshold, 5000) / 100.0; -- Convert cents to dollars

  RETURN QUERY
  SELECT
    t.producer_id,
    COALESCE(pr.stage_name, pr.legal_name) AS producer_name,
    pr.stripe_account_id,
    SUM(rd.producer_amount) AS total_amount,
    ARRAY_AGG(rd.id) AS distribution_ids
  FROM deals.revenue_distributions rd
  JOIN deals.revenue_events re ON re.id = rd.revenue_event_id
  JOIN deals.tracks t ON t.id = re.track_id
  JOIN deals.producers pr ON pr.id = t.producer_id
  WHERE rd.payout_status = 'pending'
    AND rd.producer_amount > 0
    AND rd.distribution_type != 'buyout'
    AND (p_producer_id IS NULL OR t.producer_id = p_producer_id)
  GROUP BY t.producer_id, pr.stage_name, pr.legal_name, pr.stripe_account_id
  HAVING SUM(rd.producer_amount) >= v_threshold;
END;
$$;

-- 9. RPC: Mark distributions as processing/completed
CREATE OR REPLACE FUNCTION public.mark_distributions_processing(p_user_id UUID, p_distribution_ids UUID[], p_payout_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
BEGIN
  IF NOT public.is_deal_admin(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  UPDATE deals.revenue_distributions
  SET payout_status = 'processing', payout_id = p_payout_id
  WHERE id = ANY(p_distribution_ids) AND payout_status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_payout(p_payout_id UUID, p_stripe_transfer_id TEXT, p_stripe_event_id TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
BEGIN
  UPDATE deals.payouts
  SET status = 'completed', payout_provider_reference = p_stripe_transfer_id,
      stripe_event_id = p_stripe_event_id, processed_at = now()
  WHERE id = p_payout_id;

  UPDATE deals.revenue_distributions
  SET payout_status = 'completed'
  WHERE payout_id = p_payout_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_payout(p_payout_id UUID, p_error TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
BEGIN
  UPDATE deals.payouts
  SET status = 'failed', error_message = p_error, retry_count = retry_count + 1
  WHERE id = p_payout_id;

  UPDATE deals.revenue_distributions
  SET payout_status = 'pending', payout_id = NULL
  WHERE payout_id = p_payout_id;

  -- Flag for review after 3 retries
  UPDATE deals.payouts
  SET flagged_for_review = TRUE
  WHERE id = p_payout_id AND retry_count >= 3;
END;
$$;

-- 10. Finance admin RPCs
CREATE OR REPLACE FUNCTION public.finance_pending_producer_payouts(p_user_id UUID)
RETURNS TABLE(
  producer_id UUID,
  producer_name TEXT,
  stripe_account_id TEXT,
  stripe_onboarded BOOLEAN,
  pending_amount NUMERIC,
  distribution_count BIGINT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
BEGIN
  IF NOT public.is_deal_viewer(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY
  SELECT t.producer_id, COALESCE(pr.stage_name, pr.legal_name),
    pr.stripe_account_id, pr.stripe_onboarded,
    SUM(rd.producer_amount), COUNT(rd.id)
  FROM deals.revenue_distributions rd
  JOIN deals.revenue_events re ON re.id = rd.revenue_event_id
  JOIN deals.tracks t ON t.id = re.track_id
  JOIN deals.producers pr ON pr.id = t.producer_id
  WHERE rd.payout_status = 'pending' AND rd.producer_amount > 0
  GROUP BY t.producer_id, pr.stage_name, pr.legal_name, pr.stripe_account_id, pr.stripe_onboarded
  ORDER BY SUM(rd.producer_amount) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_producer_payouts(p_user_id UUID, p_status TEXT DEFAULT NULL)
RETURNS TABLE(
  id UUID, producer_id UUID, producer_name TEXT, amount NUMERIC,
  payout_type TEXT, payout_provider_reference TEXT, status deals.payout_status,
  stripe_event_id TEXT, error_message TEXT, retry_count INTEGER,
  flagged_for_review BOOLEAN, processed_at TIMESTAMPTZ, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
BEGIN
  IF NOT public.is_deal_viewer(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY
  SELECT p.id, p.producer_id, COALESCE(pr.stage_name, pr.legal_name),
    p.amount, p.payout_type, p.payout_provider_reference, p.status,
    p.stripe_event_id, p.error_message, p.retry_count,
    p.flagged_for_review, p.processed_at, p.created_at
  FROM deals.payouts p
  JOIN deals.producers pr ON pr.id = p.producer_id
  WHERE (p_status IS NULL OR p.status::TEXT = p_status)
  ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_liability_summary(p_user_id UUID)
RETURNS TABLE(
  total_producer_liability NUMERIC,
  total_dancer_liability NUMERIC,
  total_producer_paid NUMERIC,
  total_dancer_paid NUMERIC
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
BEGIN
  IF NOT public.is_deal_viewer(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY
  SELECT
    COALESCE((SELECT SUM(rd.producer_amount) FROM deals.revenue_distributions rd WHERE rd.payout_status != 'completed' AND rd.producer_amount > 0), 0),
    COALESCE((SELECT SUM(p.amount_cents::NUMERIC / 100) FROM public.payouts p WHERE p.status != 'completed'), 0),
    COALESCE((SELECT SUM(p.amount) FROM deals.payouts p WHERE p.status = 'completed'), 0),
    COALESCE((SELECT SUM(p.amount_cents::NUMERIC / 100) FROM public.payouts p WHERE p.status = 'completed'), 0);
END;
$$;

-- 11. Enhanced producer earnings with campaign/track breakdown
CREATE OR REPLACE FUNCTION public.producer_earnings_by_track(p_user_id UUID)
RETURNS TABLE(
  track_id UUID, track_title TEXT, total_gross NUMERIC, total_net NUMERIC,
  total_producer NUMERIC, total_platform NUMERIC, distribution_count BIGINT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
DECLARE v_pid UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT re.track_id, t.title,
    SUM(re.gross_revenue), SUM(re.net_revenue),
    SUM(rd.producer_amount), SUM(rd.platform_amount), COUNT(rd.id)
  FROM deals.revenue_distributions rd
  JOIN deals.revenue_events re ON re.id = rd.revenue_event_id
  JOIN deals.tracks t ON t.id = re.track_id
  WHERE t.producer_id = v_pid
  GROUP BY re.track_id, t.title
  ORDER BY SUM(rd.producer_amount) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.producer_earnings_by_campaign(p_user_id UUID)
RETURNS TABLE(
  campaign_id UUID, track_id UUID, track_title TEXT,
  total_producer NUMERIC, event_count BIGINT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
DECLARE v_pid UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT re.campaign_id, re.track_id, t.title,
    SUM(rd.producer_amount), COUNT(rd.id)
  FROM deals.revenue_distributions rd
  JOIN deals.revenue_events re ON re.id = rd.revenue_event_id
  JOIN deals.tracks t ON t.id = re.track_id
  WHERE t.producer_id = v_pid AND re.campaign_id IS NOT NULL
  GROUP BY re.campaign_id, re.track_id, t.title
  ORDER BY SUM(rd.producer_amount) DESC;
END;
$$;

-- 12. RLS for platform_settings
ALTER TABLE deals.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access" ON deals.platform_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Finance view settings" ON deals.platform_settings
  FOR SELECT USING (is_deal_viewer(auth.uid()));
