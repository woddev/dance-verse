
-- ============================================================
-- MUSIC DEAL MANAGEMENT SYSTEM — deals schema
-- ============================================================

CREATE SCHEMA IF NOT EXISTS deals;

-- ======================== ENUMS ========================

CREATE TYPE deals.deal_type AS ENUM ('buyout', 'revenue_split', 'hybrid');
CREATE TYPE deals.track_status AS ENUM ('draft', 'submitted', 'under_review', 'denied', 'offer_pending', 'offer_sent', 'counter_received', 'deal_signed', 'active', 'expired', 'terminated');
CREATE TYPE deals.offer_status AS ENUM ('draft', 'sent', 'viewed', 'countered', 'revised', 'accepted', 'rejected', 'expired', 'signed');
CREATE TYPE deals.contract_status AS ENUM ('generated', 'sent_for_signature', 'signed_by_producer', 'signed_by_platform', 'fully_executed', 'archived');
CREATE TYPE deals.payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- ======================== TABLES ========================

-- 1. producers
CREATE TABLE deals.producers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- links to auth.users for RLS
  legal_name TEXT NOT NULL,
  stage_name TEXT,
  email TEXT NOT NULL UNIQUE,
  country TEXT,
  payout_provider_id TEXT,
  tax_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. tracks
CREATE TABLE deals.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES deals.producers(id),
  title TEXT NOT NULL,
  bpm INTEGER,
  genre TEXT,
  mood_tags JSONB,
  isrc TEXT,
  master_ownership_percent NUMERIC(5,2),
  publishing_ownership_percent NUMERIC(5,2),
  explicit_flag BOOLEAN DEFAULT false,
  file_url TEXT NOT NULL,
  artwork_url TEXT,
  status deals.track_status NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. track_state_history
CREATE TABLE deals.track_state_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES deals.tracks(id),
  previous_state TEXT,
  new_state TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. offers
CREATE TABLE deals.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES deals.tracks(id),
  version_number INTEGER NOT NULL,
  deal_type deals.deal_type NOT NULL,
  buyout_amount NUMERIC(12,2),
  producer_split_percent NUMERIC(5,2),
  platform_split_percent NUMERIC(5,2),
  term_length TEXT,
  territory TEXT,
  exclusivity_flag BOOLEAN DEFAULT false,
  status deals.offer_status NOT NULL DEFAULT 'draft',
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (track_id, version_number)
);

-- 5. offer_state_history
CREATE TABLE deals.offer_state_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES deals.offers(id),
  previous_state TEXT,
  new_state TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. contracts
CREATE TABLE deals.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES deals.offers(id),
  template_version TEXT,
  pdf_url TEXT,
  producer_signed_at TIMESTAMPTZ,
  admin_signed_at TIMESTAMPTZ,
  status deals.contract_status NOT NULL DEFAULT 'generated',
  hash_checksum TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. revenue_events
CREATE TABLE deals.revenue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES deals.tracks(id),
  campaign_id UUID,
  gross_revenue NUMERIC(12,2) NOT NULL,
  platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_revenue NUMERIC(12,2) NOT NULL,
  event_source TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. revenue_distributions
CREATE TABLE deals.revenue_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revenue_event_id UUID NOT NULL REFERENCES deals.revenue_events(id),
  producer_amount NUMERIC(12,2) NOT NULL,
  platform_amount NUMERIC(12,2) NOT NULL,
  payout_status deals.payout_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. payouts
CREATE TABLE deals.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES deals.producers(id),
  amount NUMERIC(12,2) NOT NULL,
  payout_type TEXT,
  payout_provider_reference TEXT,
  status deals.payout_status NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ======================== INDEXES ========================

CREATE INDEX idx_deals_tracks_producer ON deals.tracks(producer_id);
CREATE INDEX idx_deals_tracks_status ON deals.tracks(status);
CREATE INDEX idx_deals_track_history_track ON deals.track_state_history(track_id);
CREATE INDEX idx_deals_offers_track ON deals.offers(track_id);
CREATE INDEX idx_deals_offers_status ON deals.offers(status);
CREATE INDEX idx_deals_offer_history_offer ON deals.offer_state_history(offer_id);
CREATE INDEX idx_deals_contracts_offer ON deals.contracts(offer_id);
CREATE INDEX idx_deals_contracts_status ON deals.contracts(status);
CREATE INDEX idx_deals_rev_events_track ON deals.revenue_events(track_id);
CREATE INDEX idx_deals_rev_dist_event ON deals.revenue_distributions(revenue_event_id);
CREATE INDEX idx_deals_rev_dist_status ON deals.revenue_distributions(payout_status);
CREATE INDEX idx_deals_payouts_producer ON deals.payouts(producer_id);
CREATE INDEX idx_deals_payouts_status ON deals.payouts(status);

-- ======================== VALIDATION TRIGGERS ========================

-- net_revenue = gross_revenue - platform_fee
CREATE OR REPLACE FUNCTION deals.validate_net_revenue()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.net_revenue IS DISTINCT FROM (NEW.gross_revenue - NEW.platform_fee) THEN
    RAISE EXCEPTION 'net_revenue (%) must equal gross_revenue (%) - platform_fee (%)',
      NEW.net_revenue, NEW.gross_revenue, NEW.platform_fee;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_net_revenue
BEFORE INSERT OR UPDATE ON deals.revenue_events
FOR EACH ROW EXECUTE FUNCTION deals.validate_net_revenue();

-- Offer immutability once signed
CREATE OR REPLACE FUNCTION deals.prevent_signed_offer_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'signed' THEN
    RAISE EXCEPTION 'Cannot modify a signed offer (id: %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_offer_immutability
BEFORE UPDATE ON deals.offers
FOR EACH ROW EXECUTE FUNCTION deals.prevent_signed_offer_update();

-- Contract immutability once fully_executed
CREATE OR REPLACE FUNCTION deals.prevent_executed_contract_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'fully_executed' THEN
    RAISE EXCEPTION 'Cannot modify a fully executed contract (id: %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contract_immutability
BEFORE UPDATE ON deals.contracts
FOR EACH ROW EXECUTE FUNCTION deals.prevent_executed_contract_update();

-- Prevent DELETE on financial tables
CREATE OR REPLACE FUNCTION deals.prevent_financial_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Deleting financial records is not allowed on table %', TG_TABLE_NAME;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_no_delete_revenue_events
BEFORE DELETE ON deals.revenue_events
FOR EACH ROW EXECUTE FUNCTION deals.prevent_financial_delete();

CREATE TRIGGER trg_no_delete_revenue_distributions
BEFORE DELETE ON deals.revenue_distributions
FOR EACH ROW EXECUTE FUNCTION deals.prevent_financial_delete();

CREATE TRIGGER trg_no_delete_payouts
BEFORE DELETE ON deals.payouts
FOR EACH ROW EXECUTE FUNCTION deals.prevent_financial_delete();

-- ======================== STATE MACHINE FUNCTIONS ========================

-- Track state transitions
CREATE OR REPLACE FUNCTION deals.transition_track_state(
  p_track_id UUID,
  p_new_state deals.track_status,
  p_changed_by UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = deals
AS $$
DECLARE
  v_current deals.track_status;
  v_allowed deals.track_status[];
BEGIN
  SELECT status INTO v_current FROM deals.tracks WHERE id = p_track_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Track % not found', p_track_id; END IF;

  v_allowed := CASE v_current
    WHEN 'draft' THEN ARRAY['submitted']::deals.track_status[]
    WHEN 'submitted' THEN ARRAY['under_review']::deals.track_status[]
    WHEN 'under_review' THEN ARRAY['denied','offer_pending']::deals.track_status[]
    WHEN 'denied' THEN ARRAY['draft']::deals.track_status[]
    WHEN 'offer_pending' THEN ARRAY['offer_sent']::deals.track_status[]
    WHEN 'offer_sent' THEN ARRAY['counter_received','deal_signed']::deals.track_status[]
    WHEN 'counter_received' THEN ARRAY['offer_sent','denied']::deals.track_status[]
    WHEN 'deal_signed' THEN ARRAY['active']::deals.track_status[]
    WHEN 'active' THEN ARRAY['expired','terminated']::deals.track_status[]
    ELSE ARRAY[]::deals.track_status[]
  END;

  IF NOT (p_new_state = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid track transition from % to %', v_current, p_new_state;
  END IF;

  INSERT INTO deals.track_state_history (track_id, previous_state, new_state, changed_by)
  VALUES (p_track_id, v_current::text, p_new_state::text, p_changed_by);

  UPDATE deals.tracks SET status = p_new_state WHERE id = p_track_id;
END;
$$;

-- Offer state transitions
CREATE OR REPLACE FUNCTION deals.transition_offer_state(
  p_offer_id UUID,
  p_new_state deals.offer_status,
  p_changed_by UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = deals
AS $$
DECLARE
  v_current deals.offer_status;
  v_allowed deals.offer_status[];
BEGIN
  SELECT status INTO v_current FROM deals.offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer % not found', p_offer_id; END IF;

  v_allowed := CASE v_current
    WHEN 'draft' THEN ARRAY['sent']::deals.offer_status[]
    WHEN 'sent' THEN ARRAY['viewed','expired']::deals.offer_status[]
    WHEN 'viewed' THEN ARRAY['countered','accepted','rejected']::deals.offer_status[]
    WHEN 'countered' THEN ARRAY['revised','rejected']::deals.offer_status[]
    WHEN 'revised' THEN ARRAY['sent']::deals.offer_status[]
    WHEN 'accepted' THEN ARRAY['signed']::deals.offer_status[]
    ELSE ARRAY[]::deals.offer_status[]
  END;

  IF NOT (p_new_state = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid offer transition from % to %', v_current, p_new_state;
  END IF;

  INSERT INTO deals.offer_state_history (offer_id, previous_state, new_state, changed_by)
  VALUES (p_offer_id, v_current::text, p_new_state::text, p_changed_by);

  UPDATE deals.offers SET status = p_new_state WHERE id = p_offer_id;
END;
$$;

-- Contract state transitions
CREATE OR REPLACE FUNCTION deals.transition_contract_state(
  p_contract_id UUID,
  p_new_state deals.contract_status,
  p_changed_by UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = deals
AS $$
DECLARE
  v_current deals.contract_status;
  v_allowed deals.contract_status[];
BEGIN
  SELECT status INTO v_current FROM deals.contracts WHERE id = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract % not found', p_contract_id; END IF;

  v_allowed := CASE v_current
    WHEN 'generated' THEN ARRAY['sent_for_signature']::deals.contract_status[]
    WHEN 'sent_for_signature' THEN ARRAY['signed_by_producer']::deals.contract_status[]
    WHEN 'signed_by_producer' THEN ARRAY['signed_by_platform']::deals.contract_status[]
    WHEN 'signed_by_platform' THEN ARRAY['fully_executed']::deals.contract_status[]
    WHEN 'fully_executed' THEN ARRAY['archived']::deals.contract_status[]
    ELSE ARRAY[]::deals.contract_status[]
  END;

  IF NOT (p_new_state = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid contract transition from % to %', v_current, p_new_state;
  END IF;

  UPDATE deals.contracts SET status = p_new_state WHERE id = p_contract_id;
END;
$$;

-- ======================== REVENUE DISTRIBUTION ========================

CREATE OR REPLACE FUNCTION deals.create_revenue_distribution(p_revenue_event_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = deals
AS $$
DECLARE
  v_net NUMERIC(12,2);
  v_track_id UUID;
  v_producer_split NUMERIC(5,2);
  v_platform_split NUMERIC(5,2);
  v_dist_id UUID;
BEGIN
  SELECT net_revenue, track_id INTO v_net, v_track_id
  FROM deals.revenue_events WHERE id = p_revenue_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Revenue event % not found', p_revenue_event_id; END IF;

  -- Get the latest signed offer for this track
  SELECT producer_split_percent, platform_split_percent
  INTO v_producer_split, v_platform_split
  FROM deals.offers
  WHERE track_id = v_track_id AND status = 'signed'
  ORDER BY version_number DESC LIMIT 1;

  IF v_producer_split IS NULL THEN
    RAISE EXCEPTION 'No signed offer found for track %', v_track_id;
  END IF;

  INSERT INTO deals.revenue_distributions (revenue_event_id, producer_amount, platform_amount)
  VALUES (
    p_revenue_event_id,
    ROUND(v_net * v_producer_split / 100, 2),
    ROUND(v_net * v_platform_split / 100, 2)
  )
  RETURNING id INTO v_dist_id;

  RETURN v_dist_id;
END;
$$;

-- ======================== ROW-LEVEL SECURITY ========================

ALTER TABLE deals.producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals.track_state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals.offer_state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals.revenue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals.revenue_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals.payouts ENABLE ROW LEVEL SECURITY;

-- Admin full access (all tables)
CREATE POLICY "Admin full access" ON deals.producers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access" ON deals.tracks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access" ON deals.track_state_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access" ON deals.offers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access" ON deals.offer_state_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access" ON deals.contracts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access" ON deals.revenue_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access" ON deals.revenue_distributions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin full access" ON deals.payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Producer own-data policies
CREATE POLICY "Producers select own" ON deals.producers FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Producers update own" ON deals.producers FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Producers select own tracks" ON deals.tracks FOR SELECT TO authenticated
  USING (producer_id IN (SELECT id FROM deals.producers WHERE user_id = auth.uid()));
CREATE POLICY "Producers insert own tracks" ON deals.tracks FOR INSERT TO authenticated
  WITH CHECK (producer_id IN (SELECT id FROM deals.producers WHERE user_id = auth.uid()));
CREATE POLICY "Producers update own tracks" ON deals.tracks FOR UPDATE TO authenticated
  USING (producer_id IN (SELECT id FROM deals.producers WHERE user_id = auth.uid()));

CREATE POLICY "Producers select own offers" ON deals.offers FOR SELECT TO authenticated
  USING (track_id IN (SELECT id FROM deals.tracks WHERE producer_id IN (SELECT id FROM deals.producers WHERE user_id = auth.uid())));

CREATE POLICY "Producers select own contracts" ON deals.contracts FOR SELECT TO authenticated
  USING (offer_id IN (SELECT id FROM deals.offers WHERE track_id IN (SELECT id FROM deals.tracks WHERE producer_id IN (SELECT id FROM deals.producers WHERE user_id = auth.uid()))));

CREATE POLICY "Producers select own revenue_events" ON deals.revenue_events FOR SELECT TO authenticated
  USING (track_id IN (SELECT id FROM deals.tracks WHERE producer_id IN (SELECT id FROM deals.producers WHERE user_id = auth.uid())));

CREATE POLICY "Producers select own distributions" ON deals.revenue_distributions FOR SELECT TO authenticated
  USING (revenue_event_id IN (SELECT id FROM deals.revenue_events WHERE track_id IN (SELECT id FROM deals.tracks WHERE producer_id IN (SELECT id FROM deals.producers WHERE user_id = auth.uid()))));

CREATE POLICY "Producers select own payouts" ON deals.payouts FOR SELECT TO authenticated
  USING (producer_id IN (SELECT id FROM deals.producers WHERE user_id = auth.uid()));

CREATE POLICY "Producers select own track history" ON deals.track_state_history FOR SELECT TO authenticated
  USING (track_id IN (SELECT id FROM deals.tracks WHERE producer_id IN (SELECT id FROM deals.producers WHERE user_id = auth.uid())));

CREATE POLICY "Producers select own offer history" ON deals.offer_state_history FOR SELECT TO authenticated
  USING (offer_id IN (SELECT id FROM deals.offers WHERE track_id IN (SELECT id FROM deals.tracks WHERE producer_id IN (SELECT id FROM deals.producers WHERE user_id = auth.uid()))));

-- Grant usage on deals schema to authenticated and anon roles
GRANT USAGE ON SCHEMA deals TO authenticated;
GRANT USAGE ON SCHEMA deals TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA deals TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA deals TO anon;
