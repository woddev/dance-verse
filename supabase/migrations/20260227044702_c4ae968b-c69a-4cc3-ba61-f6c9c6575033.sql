
-- Role-checking helpers
CREATE OR REPLACE FUNCTION public.is_deal_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_deal_viewer(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'super_admin', 'finance_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  );
$$;

-- Admin Deal Overview
CREATE OR REPLACE FUNCTION public.admin_deal_overview(p_user_id UUID)
RETURNS TABLE(
  total_tracks BIGINT, tracks_under_review BIGINT, active_deals BIGINT,
  total_revenue NUMERIC, pending_payout_liability NUMERIC, approval_rate NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, deals
AS $$
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
    CASE WHEN v_total_submitted = 0 THEN 0 ELSE ROUND(v_total_approved * 100.0 / v_total_submitted, 1) END;
END;
$$;

-- Admin list deal tracks
CREATE OR REPLACE FUNCTION public.admin_deal_tracks(p_user_id UUID, p_status TEXT DEFAULT NULL)
RETURNS TABLE(id UUID, title TEXT, status deals.track_status, genre TEXT, bpm INT, isrc TEXT, created_at TIMESTAMPTZ, producer_name TEXT, producer_id UUID, denial_reason TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, deals
AS $$
BEGIN
  IF NOT public.is_deal_viewer(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY SELECT t.id, t.title, t.status, t.genre, t.bpm, t.isrc, t.created_at,
    COALESCE(pr.stage_name, pr.legal_name), pr.id, t.denial_reason
  FROM deals.tracks t JOIN deals.producers pr ON pr.id = t.producer_id
  WHERE (p_status IS NULL OR t.status::TEXT = p_status) ORDER BY t.created_at DESC;
END;
$$;

-- Admin track detail
CREATE OR REPLACE FUNCTION public.admin_deal_track_detail(p_user_id UUID, p_track_id UUID)
RETURNS TABLE(id UUID, title TEXT, bpm INT, genre TEXT, mood_tags JSONB, isrc TEXT, master_ownership_percent NUMERIC, publishing_ownership_percent NUMERIC, explicit_flag BOOLEAN, file_url TEXT, artwork_url TEXT, status deals.track_status, created_at TIMESTAMPTZ, producer_name TEXT, producer_email TEXT, denial_reason TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, deals
AS $$
BEGIN
  IF NOT public.is_deal_viewer(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY SELECT t.id, t.title, t.bpm, t.genre, t.mood_tags, t.isrc,
    t.master_ownership_percent, t.publishing_ownership_percent,
    t.explicit_flag, t.file_url, t.artwork_url, t.status, t.created_at,
    COALESCE(pr.stage_name, pr.legal_name), pr.email, t.denial_reason
  FROM deals.tracks t JOIN deals.producers pr ON pr.id = t.producer_id WHERE t.id = p_track_id;
END;
$$;

-- Admin track state history
CREATE OR REPLACE FUNCTION public.admin_deal_track_history(p_user_id UUID, p_track_id UUID)
RETURNS TABLE(id UUID, previous_state TEXT, new_state TEXT, changed_by UUID, changed_at TIMESTAMPTZ, override_reason TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, deals
AS $$
BEGIN
  IF NOT public.is_deal_viewer(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY SELECT h.id, h.previous_state, h.new_state, h.changed_by, h.changed_at, h.override_reason
  FROM deals.track_state_history h WHERE h.track_id = p_track_id ORDER BY h.changed_at ASC;
END;
$$;

-- Admin track offers
CREATE OR REPLACE FUNCTION public.admin_track_offers(p_user_id UUID, p_track_id UUID)
RETURNS TABLE(id UUID, version_number INT, deal_type TEXT, status deals.offer_status, buyout_amount NUMERIC, producer_split_percent NUMERIC, platform_split_percent NUMERIC, term_length TEXT, territory TEXT, exclusivity_flag BOOLEAN, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ, created_by UUID)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, deals
AS $$
BEGIN
  IF NOT public.is_deal_viewer(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY SELECT o.id, o.version_number, o.deal_type::TEXT, o.status,
    o.buyout_amount, o.producer_split_percent, o.platform_split_percent,
    o.term_length, o.territory, o.exclusivity_flag, o.expires_at, o.created_at, o.created_by
  FROM deals.offers o WHERE o.track_id = p_track_id ORDER BY o.version_number ASC;
END;
$$;

-- Admin track contracts
CREATE OR REPLACE FUNCTION public.admin_track_contracts(p_user_id UUID, p_track_id UUID)
RETURNS TABLE(id UUID, offer_id UUID, offer_version INT, status deals.contract_status, producer_signed_at TIMESTAMPTZ, admin_signed_at TIMESTAMPTZ, pdf_url TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, deals
AS $$
BEGIN
  IF NOT public.is_deal_viewer(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY SELECT c.id, c.offer_id, o.version_number, c.status,
    c.producer_signed_at, c.admin_signed_at, c.pdf_url, c.created_at
  FROM deals.contracts c JOIN deals.offers o ON o.id = c.offer_id
  WHERE o.track_id = p_track_id ORDER BY c.created_at DESC;
END;
$$;

-- Admin: review track
CREATE OR REPLACE FUNCTION public.admin_review_track(p_user_id UUID, p_track_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, deals AS $$
BEGIN
  IF NOT public.is_deal_admin(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  PERFORM deals.transition_track_state(p_track_id, 'under_review', p_user_id);
END; $$;

-- Admin: deny track
CREATE OR REPLACE FUNCTION public.admin_deny_track(p_user_id UUID, p_track_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, deals AS $$
BEGIN
  IF NOT public.is_deal_admin(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  IF p_reason IS NULL OR p_reason = '' THEN RAISE EXCEPTION 'Denial reason is required'; END IF;
  UPDATE deals.tracks SET denial_reason = p_reason WHERE id = p_track_id;
  PERFORM deals.transition_track_state(p_track_id, 'denied', p_user_id);
END; $$;

-- Admin: reopen denied track (super_admin only)
CREATE OR REPLACE FUNCTION public.admin_reopen_track(p_user_id UUID, p_track_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, deals AS $$
BEGIN
  IF NOT public.is_super_admin(p_user_id) THEN RAISE EXCEPTION 'Super admin access required'; END IF;
  UPDATE deals.tracks SET denial_reason = NULL WHERE id = p_track_id;
  PERFORM deals.transition_track_state(p_track_id, 'draft', p_user_id);
END; $$;

-- Admin: create and send offer
CREATE OR REPLACE FUNCTION public.admin_create_offer(
  p_user_id UUID, p_track_id UUID, p_deal_type TEXT,
  p_buyout_amount NUMERIC, p_producer_split NUMERIC, p_platform_split NUMERIC,
  p_term_length TEXT, p_territory TEXT, p_exclusivity BOOLEAN, p_expires_at TIMESTAMPTZ
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, deals AS $$
DECLARE v_offer_id UUID; v_version INT; v_track_status deals.track_status;
BEGIN
  IF NOT public.is_deal_admin(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  SELECT status INTO v_track_status FROM deals.tracks WHERE id = p_track_id;
  IF v_track_status IS NULL THEN RAISE EXCEPTION 'Track not found'; END IF;
  IF v_track_status = 'under_review' THEN
    PERFORM deals.transition_track_state(p_track_id, 'offer_pending', p_user_id);
  ELSIF v_track_status != 'offer_pending' THEN
    RAISE EXCEPTION 'Track must be in under_review or offer_pending state';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version FROM deals.offers WHERE track_id = p_track_id;
  INSERT INTO deals.offers (track_id, version_number, deal_type, buyout_amount, producer_split_percent, platform_split_percent, term_length, territory, exclusivity_flag, expires_at, status, created_by)
  VALUES (p_track_id, v_version, p_deal_type::deals.deal_type, p_buyout_amount, p_producer_split, p_platform_split, p_term_length, p_territory, p_exclusivity, p_expires_at, 'draft', p_user_id)
  RETURNING id INTO v_offer_id;
  INSERT INTO deals.offer_state_history (offer_id, previous_state, new_state, changed_by) VALUES (v_offer_id, NULL, 'draft', p_user_id);
  PERFORM deals.transition_offer_state(v_offer_id, 'sent', p_user_id);
  PERFORM deals.transition_track_state(p_track_id, 'offer_sent', p_user_id);
  RETURN v_offer_id;
END; $$;

-- Admin list all offers
CREATE OR REPLACE FUNCTION public.admin_deal_offers(p_user_id UUID)
RETURNS TABLE(id UUID, track_id UUID, track_title TEXT, producer_name TEXT, deal_type TEXT, version_number INT, status deals.offer_status, buyout_amount NUMERIC, producer_split_percent NUMERIC, platform_split_percent NUMERIC, term_length TEXT, territory TEXT, exclusivity_flag BOOLEAN, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, deals AS $$
BEGIN
  IF NOT public.is_deal_viewer(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY SELECT o.id, o.track_id, t.title, COALESCE(pr.stage_name, pr.legal_name),
    o.deal_type::TEXT, o.version_number, o.status, o.buyout_amount, o.producer_split_percent, o.platform_split_percent,
    o.term_length, o.territory, o.exclusivity_flag, o.expires_at, o.created_at
  FROM deals.offers o JOIN deals.tracks t ON t.id = o.track_id JOIN deals.producers pr ON pr.id = t.producer_id
  ORDER BY o.created_at DESC;
END; $$;

-- Admin offer history
CREATE OR REPLACE FUNCTION public.admin_offer_history(p_user_id UUID, p_offer_id UUID)
RETURNS TABLE(id UUID, previous_state TEXT, new_state TEXT, changed_by UUID, changed_at TIMESTAMPTZ, override_reason TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, deals AS $$
BEGIN
  IF NOT public.is_deal_viewer(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY SELECT h.id, h.previous_state, h.new_state, h.changed_by, h.changed_at, h.override_reason
  FROM deals.offer_state_history h WHERE h.offer_id = p_offer_id ORDER BY h.changed_at ASC;
END; $$;

-- Admin: revise offer
CREATE OR REPLACE FUNCTION public.admin_revise_offer(
  p_user_id UUID, p_offer_id UUID, p_buyout_amount NUMERIC, p_producer_split NUMERIC,
  p_platform_split NUMERIC, p_term_length TEXT, p_territory TEXT, p_exclusivity BOOLEAN, p_expires_at TIMESTAMPTZ
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, deals AS $$
DECLARE v_track_id UUID; v_deal_type deals.deal_type; v_version INT; v_new_offer_id UUID;
BEGIN
  IF NOT public.is_deal_admin(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  SELECT o.track_id, o.deal_type INTO v_track_id, v_deal_type FROM deals.offers o WHERE o.id = p_offer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found'; END IF;
  PERFORM deals.transition_offer_state(p_offer_id, 'revised', p_user_id);
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version FROM deals.offers WHERE track_id = v_track_id;
  INSERT INTO deals.offers (track_id, version_number, deal_type, buyout_amount, producer_split_percent, platform_split_percent, term_length, territory, exclusivity_flag, expires_at, status, created_by)
  VALUES (v_track_id, v_version, v_deal_type, p_buyout_amount, p_producer_split, p_platform_split, p_term_length, p_territory, p_exclusivity, p_expires_at, 'draft', p_user_id)
  RETURNING id INTO v_new_offer_id;
  INSERT INTO deals.offer_state_history (offer_id, previous_state, new_state, changed_by) VALUES (v_new_offer_id, NULL, 'draft', p_user_id);
  PERFORM deals.transition_offer_state(v_new_offer_id, 'sent', p_user_id);
  BEGIN PERFORM deals.transition_track_state(v_track_id, 'offer_sent', p_user_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN v_new_offer_id;
END; $$;

-- Admin: accept producer counter
CREATE OR REPLACE FUNCTION public.admin_accept_counter(p_user_id UUID, p_offer_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, deals AS $$
DECLARE v_track_id UUID; v_status deals.offer_status;
BEGIN
  IF NOT public.is_deal_admin(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  SELECT o.track_id, o.status INTO v_track_id, v_status FROM deals.offers o WHERE o.id = p_offer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found'; END IF;
  IF v_status = 'draft' THEN
    PERFORM deals.transition_offer_state(p_offer_id, 'sent', p_user_id);
    PERFORM deals.transition_offer_state(p_offer_id, 'viewed', p_user_id);
    PERFORM deals.transition_offer_state(p_offer_id, 'accepted', p_user_id);
  ELSIF v_status = 'sent' THEN
    PERFORM deals.transition_offer_state(p_offer_id, 'viewed', p_user_id);
    PERFORM deals.transition_offer_state(p_offer_id, 'accepted', p_user_id);
  ELSIF v_status = 'viewed' THEN
    PERFORM deals.transition_offer_state(p_offer_id, 'accepted', p_user_id);
  ELSE RAISE EXCEPTION 'Offer must be in draft, sent, or viewed state to accept'; END IF;
  BEGIN PERFORM deals.transition_track_state(v_track_id, 'deal_signed', p_user_id); EXCEPTION WHEN OTHERS THEN NULL; END;
END; $$;

-- Admin: reject counter offer
CREATE OR REPLACE FUNCTION public.admin_reject_counter(p_user_id UUID, p_offer_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, deals AS $$
DECLARE v_status deals.offer_status;
BEGIN
  IF NOT public.is_deal_admin(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  SELECT o.status INTO v_status FROM deals.offers o WHERE o.id = p_offer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found'; END IF;
  IF v_status = 'draft' THEN
    PERFORM deals.transition_offer_state(p_offer_id, 'sent', p_user_id);
    PERFORM deals.transition_offer_state(p_offer_id, 'viewed', p_user_id);
    PERFORM deals.transition_offer_state(p_offer_id, 'rejected', p_user_id);
  ELSIF v_status = 'sent' THEN
    PERFORM deals.transition_offer_state(p_offer_id, 'viewed', p_user_id);
    PERFORM deals.transition_offer_state(p_offer_id, 'rejected', p_user_id);
  ELSIF v_status = 'viewed' THEN
    PERFORM deals.transition_offer_state(p_offer_id, 'rejected', p_user_id);
  ELSE RAISE EXCEPTION 'Offer must be in draft, sent, or viewed state to reject'; END IF;
END; $$;

-- Admin revenue events
CREATE OR REPLACE FUNCTION public.admin_revenue_events(p_user_id UUID, p_campaign_id UUID DEFAULT NULL)
RETURNS TABLE(id UUID, track_id UUID, track_title TEXT, producer_name TEXT, gross_revenue NUMERIC, platform_fee NUMERIC, net_revenue NUMERIC, campaign_id UUID, created_at TIMESTAMPTZ, distribution_id UUID, producer_amount NUMERIC, platform_amount NUMERIC, payout_status deals.payout_status)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, deals AS $$
BEGIN
  IF NOT public.is_deal_viewer(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY SELECT re.id, re.track_id, t.title, COALESCE(pr.stage_name, pr.legal_name),
    re.gross_revenue, re.platform_fee, re.net_revenue, re.campaign_id, re.created_at,
    rd.id, rd.producer_amount, rd.platform_amount, rd.payout_status
  FROM deals.revenue_events re JOIN deals.tracks t ON t.id = re.track_id
  JOIN deals.producers pr ON pr.id = t.producer_id
  LEFT JOIN deals.revenue_distributions rd ON rd.revenue_event_id = re.id
  WHERE (p_campaign_id IS NULL OR re.campaign_id = p_campaign_id) ORDER BY re.created_at DESC;
END; $$;

-- Super admin force state
CREATE OR REPLACE FUNCTION public.admin_force_state(p_user_id UUID, p_entity_type TEXT, p_entity_id UUID, p_new_state TEXT, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, deals AS $$
DECLARE v_current TEXT;
BEGIN
  IF NOT public.is_super_admin(p_user_id) THEN RAISE EXCEPTION 'Super admin access required'; END IF;
  IF p_reason IS NULL OR p_reason = '' THEN RAISE EXCEPTION 'Override reason is required'; END IF;
  IF p_entity_type = 'track' THEN
    SELECT status::TEXT INTO v_current FROM deals.tracks WHERE id = p_entity_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Track not found'; END IF;
    INSERT INTO deals.track_state_history (track_id, previous_state, new_state, changed_by, override_reason) VALUES (p_entity_id, v_current, p_new_state, p_user_id, p_reason);
    UPDATE deals.tracks SET status = p_new_state::deals.track_status WHERE id = p_entity_id;
  ELSIF p_entity_type = 'offer' THEN
    SELECT status::TEXT INTO v_current FROM deals.offers WHERE id = p_entity_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found'; END IF;
    INSERT INTO deals.offer_state_history (offer_id, previous_state, new_state, changed_by, override_reason) VALUES (p_entity_id, v_current, p_new_state, p_user_id, p_reason);
    UPDATE deals.offers SET status = p_new_state::deals.offer_status WHERE id = p_entity_id;
  ELSE RAISE EXCEPTION 'Invalid entity type. Use track or offer.'; END IF;
END; $$;
