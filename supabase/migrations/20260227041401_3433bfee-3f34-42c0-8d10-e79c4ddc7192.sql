
-- ============================================================
-- Producer API Functions (SECURITY DEFINER, ownership-enforced)
-- ============================================================

-- Helper: get producer_id for a user
CREATE OR REPLACE FUNCTION public.get_producer_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, deals
AS $$
  SELECT id FROM deals.producers WHERE user_id = p_user_id LIMIT 1;
$$;

-- Overview stats
CREATE OR REPLACE FUNCTION public.producer_overview(p_user_id UUID)
RETURNS TABLE(
  total_tracks BIGINT,
  tracks_under_review BIGINT,
  active_deals BIGINT,
  total_earned NUMERIC,
  pending_earnings NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, deals
AS $$
DECLARE
  v_pid UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM deals.tracks WHERE producer_id = v_pid)::BIGINT,
    (SELECT count(*) FROM deals.tracks WHERE producer_id = v_pid AND status = 'under_review')::BIGINT,
    (SELECT count(*) FROM deals.tracks WHERE producer_id = v_pid AND status = 'active')::BIGINT,
    COALESCE((SELECT sum(amount) FROM deals.payouts WHERE producer_id = v_pid AND status = 'completed'), 0),
    COALESCE((
      SELECT sum(rd.producer_amount)
      FROM deals.revenue_distributions rd
      JOIN deals.revenue_events re ON re.id = rd.revenue_event_id
      JOIN deals.tracks t ON t.id = re.track_id
      WHERE t.producer_id = v_pid AND rd.payout_status != 'completed'
    ), 0);
END;
$$;

-- List tracks
CREATE OR REPLACE FUNCTION public.producer_tracks(p_user_id UUID)
RETURNS TABLE(
  id UUID, title TEXT, status deals.track_status, genre TEXT, bpm INT,
  isrc TEXT, created_at TIMESTAMPTZ, deal_type TEXT, earnings NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, deals
AS $$
DECLARE v_pid UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    t.id, t.title, t.status, t.genre, t.bpm, t.isrc, t.created_at,
    (SELECT o.deal_type::TEXT FROM deals.offers o WHERE o.track_id = t.id AND o.status = 'signed' ORDER BY o.version_number DESC LIMIT 1),
    COALESCE((
      SELECT sum(rd.producer_amount)
      FROM deals.revenue_distributions rd
      JOIN deals.revenue_events re ON re.id = rd.revenue_event_id
      WHERE re.track_id = t.id
    ), 0)
  FROM deals.tracks t
  WHERE t.producer_id = v_pid
  ORDER BY t.created_at DESC;
END;
$$;

-- Track detail
CREATE OR REPLACE FUNCTION public.producer_track_detail(p_user_id UUID, p_track_id UUID)
RETURNS TABLE(
  id UUID, title TEXT, bpm INT, genre TEXT, mood_tags JSONB, isrc TEXT,
  master_ownership_percent NUMERIC, publishing_ownership_percent NUMERIC,
  explicit_flag BOOLEAN, file_url TEXT, artwork_url TEXT,
  status deals.track_status, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, deals
AS $$
DECLARE v_pid UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT t.id, t.title, t.bpm, t.genre, t.mood_tags, t.isrc,
    t.master_ownership_percent, t.publishing_ownership_percent,
    t.explicit_flag, t.file_url, t.artwork_url, t.status, t.created_at
  FROM deals.tracks t
  WHERE t.id = p_track_id AND t.producer_id = v_pid;
END;
$$;

-- Track state history
CREATE OR REPLACE FUNCTION public.producer_track_history(p_user_id UUID, p_track_id UUID)
RETURNS TABLE(id UUID, previous_state TEXT, new_state TEXT, changed_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, deals
AS $$
DECLARE v_pid UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RETURN; END IF;
  -- Verify ownership
  IF NOT EXISTS (SELECT 1 FROM deals.tracks WHERE id = p_track_id AND producer_id = v_pid) THEN RETURN; END IF;

  RETURN QUERY
  SELECT h.id, h.previous_state, h.new_state, h.changed_at
  FROM deals.track_state_history h
  WHERE h.track_id = p_track_id
  ORDER BY h.changed_at ASC;
END;
$$;

-- Submit track
CREATE OR REPLACE FUNCTION public.producer_submit_track(
  p_user_id UUID, p_title TEXT, p_bpm INT, p_genre TEXT,
  p_mood_tags TEXT, p_isrc TEXT, p_master_pct NUMERIC, p_publishing_pct NUMERIC,
  p_explicit BOOLEAN, p_file_url TEXT, p_artwork_url TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, deals
AS $$
DECLARE
  v_pid UUID;
  v_track_id UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RAISE EXCEPTION 'Producer record not found for user'; END IF;

  INSERT INTO deals.tracks (
    producer_id, title, bpm, genre, mood_tags, isrc,
    master_ownership_percent, publishing_ownership_percent,
    explicit_flag, file_url, artwork_url, status, created_by
  ) VALUES (
    v_pid, p_title, p_bpm, p_genre,
    CASE WHEN p_mood_tags IS NOT NULL THEN p_mood_tags::JSONB ELSE NULL END,
    p_isrc, p_master_pct, p_publishing_pct,
    p_explicit, p_file_url, p_artwork_url, 'submitted', p_user_id
  ) RETURNING id INTO v_track_id;

  -- Log initial state
  INSERT INTO deals.track_state_history (track_id, previous_state, new_state, changed_by)
  VALUES (v_track_id, NULL, 'submitted', p_user_id);

  RETURN v_track_id;
END;
$$;

-- List offers
CREATE OR REPLACE FUNCTION public.producer_offers(p_user_id UUID)
RETURNS TABLE(
  id UUID, track_id UUID, track_title TEXT, deal_type TEXT,
  version_number INT, status deals.offer_status, expires_at TIMESTAMPTZ,
  buyout_amount NUMERIC, producer_split_percent NUMERIC, platform_split_percent NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, deals
AS $$
DECLARE v_pid UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT o.id, o.track_id, t.title, o.deal_type::TEXT,
    o.version_number, o.status, o.expires_at,
    o.buyout_amount, o.producer_split_percent, o.platform_split_percent,
    o.created_at
  FROM deals.offers o
  JOIN deals.tracks t ON t.id = o.track_id
  WHERE t.producer_id = v_pid
  ORDER BY o.created_at DESC;
END;
$$;

-- Offer detail
CREATE OR REPLACE FUNCTION public.producer_offer_detail(p_user_id UUID, p_offer_id UUID)
RETURNS TABLE(
  id UUID, track_id UUID, track_title TEXT, deal_type TEXT,
  version_number INT, buyout_amount NUMERIC,
  producer_split_percent NUMERIC, platform_split_percent NUMERIC,
  term_length TEXT, territory TEXT, exclusivity_flag BOOLEAN,
  status deals.offer_status, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, deals
AS $$
DECLARE v_pid UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT o.id, o.track_id, t.title, o.deal_type::TEXT,
    o.version_number, o.buyout_amount,
    o.producer_split_percent, o.platform_split_percent,
    o.term_length, o.territory, o.exclusivity_flag,
    o.status, o.expires_at, o.created_at
  FROM deals.offers o
  JOIN deals.tracks t ON t.id = o.track_id
  WHERE o.id = p_offer_id AND t.producer_id = v_pid;
END;
$$;

-- Accept offer
CREATE OR REPLACE FUNCTION public.producer_accept_offer(p_user_id UUID, p_offer_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, deals
AS $$
DECLARE
  v_pid UUID;
  v_track_id UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RAISE EXCEPTION 'Producer not found'; END IF;

  -- Verify ownership
  SELECT o.track_id INTO v_track_id
  FROM deals.offers o
  JOIN deals.tracks t ON t.id = o.track_id
  WHERE o.id = p_offer_id AND t.producer_id = v_pid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found or access denied'; END IF;

  -- Must be in 'viewed' state to accept (or 'sent' directly)
  PERFORM deals.transition_offer_state(p_offer_id, 'accepted', p_user_id);

  -- Also transition track to deal_signed if offer_sent
  BEGIN
    PERFORM deals.transition_track_state(v_track_id, 'deal_signed', p_user_id);
  EXCEPTION WHEN OTHERS THEN
    -- Track may already be in correct state
    NULL;
  END;
END;
$$;

-- Reject offer
CREATE OR REPLACE FUNCTION public.producer_reject_offer(p_user_id UUID, p_offer_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, deals
AS $$
DECLARE
  v_pid UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RAISE EXCEPTION 'Producer not found'; END IF;

  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM deals.offers o
    JOIN deals.tracks t ON t.id = o.track_id
    WHERE o.id = p_offer_id AND t.producer_id = v_pid
  ) THEN RAISE EXCEPTION 'Offer not found or access denied'; END IF;

  PERFORM deals.transition_offer_state(p_offer_id, 'rejected', p_user_id);
END;
$$;

-- Counter offer
CREATE OR REPLACE FUNCTION public.producer_counter_offer(
  p_user_id UUID, p_offer_id UUID,
  p_buyout_amount NUMERIC, p_producer_split NUMERIC, p_platform_split NUMERIC,
  p_term_length TEXT, p_territory TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, deals
AS $$
DECLARE
  v_pid UUID;
  v_track_id UUID;
  v_deal_type deals.deal_type;
  v_max_version INT;
  v_new_offer_id UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RAISE EXCEPTION 'Producer not found'; END IF;

  -- Verify ownership and get offer details
  SELECT o.track_id, o.deal_type INTO v_track_id, v_deal_type
  FROM deals.offers o
  JOIN deals.tracks t ON t.id = o.track_id
  WHERE o.id = p_offer_id AND t.producer_id = v_pid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found or access denied'; END IF;

  -- Transition current offer to countered
  PERFORM deals.transition_offer_state(p_offer_id, 'countered', p_user_id);

  -- Transition track to counter_received
  BEGIN
    PERFORM deals.transition_track_state(v_track_id, 'counter_received', p_user_id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_max_version
  FROM deals.offers WHERE track_id = v_track_id;

  -- Create new offer version
  INSERT INTO deals.offers (
    track_id, version_number, deal_type,
    buyout_amount, producer_split_percent, platform_split_percent,
    term_length, territory, status, created_by
  ) VALUES (
    v_track_id, v_max_version, v_deal_type,
    p_buyout_amount, p_producer_split, p_platform_split,
    p_term_length, p_territory, 'draft', p_user_id
  ) RETURNING id INTO v_new_offer_id;

  -- Log the new offer's initial state
  INSERT INTO deals.offer_state_history (offer_id, previous_state, new_state, changed_by)
  VALUES (v_new_offer_id, NULL, 'draft', p_user_id);

  RETURN v_new_offer_id;
END;
$$;

-- List contracts
CREATE OR REPLACE FUNCTION public.producer_contracts(p_user_id UUID)
RETURNS TABLE(
  id UUID, offer_id UUID, track_title TEXT, offer_version INT,
  status deals.contract_status, producer_signed_at TIMESTAMPTZ,
  pdf_url TEXT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, deals
AS $$
DECLARE v_pid UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT c.id, c.offer_id, t.title, o.version_number,
    c.status, c.producer_signed_at, c.pdf_url, c.created_at
  FROM deals.contracts c
  JOIN deals.offers o ON o.id = c.offer_id
  JOIN deals.tracks t ON t.id = o.track_id
  WHERE t.producer_id = v_pid
  ORDER BY c.created_at DESC;
END;
$$;

-- Earnings (revenue distributions)
CREATE OR REPLACE FUNCTION public.producer_earnings(p_user_id UUID)
RETURNS TABLE(
  id UUID, track_title TEXT, gross_revenue NUMERIC, platform_fee NUMERIC,
  net_revenue NUMERIC, producer_amount NUMERIC, platform_amount NUMERIC,
  payout_status deals.payout_status, event_date TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, deals
AS $$
DECLARE v_pid UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT rd.id, t.title, re.gross_revenue, re.platform_fee,
    re.net_revenue, rd.producer_amount, rd.platform_amount,
    rd.payout_status, re.created_at
  FROM deals.revenue_distributions rd
  JOIN deals.revenue_events re ON re.id = rd.revenue_event_id
  JOIN deals.tracks t ON t.id = re.track_id
  WHERE t.producer_id = v_pid
  ORDER BY re.created_at DESC;
END;
$$;

-- Payouts
CREATE OR REPLACE FUNCTION public.producer_payouts(p_user_id UUID)
RETURNS TABLE(
  id UUID, amount NUMERIC, payout_type TEXT,
  status deals.payout_status, processed_at TIMESTAMPTZ, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, deals
AS $$
DECLARE v_pid UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT p.id, p.amount, p.payout_type, p.status, p.processed_at, p.created_at
  FROM deals.payouts p
  WHERE p.producer_id = v_pid
  ORDER BY p.created_at DESC;
END;
$$;
